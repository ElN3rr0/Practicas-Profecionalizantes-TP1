import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AnswerGrid from '../components/pregunta/AnswerGrid';
import CrownPicker from '../components/pregunta/CrownPicker';
import Feedback from '../components/pregunta/Feedback';
import PlayerArenaCard from '../components/pregunta/PlayerArenaCard';
import PowerupBar from '../components/pregunta/PowerupBar';
import TimerBar from '../components/pregunta/TimerBar';
import UltraCategoryPicker from '../components/pregunta/UltraCategoryPicker';
import { getQuestionsByCategory } from '../lib/api/client';
import { playSound } from '../lib/audio';
import type { SoundCue } from '../lib/audio/types';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../lib/constants/categories';
import { useGame } from '../lib/game/GameProvider';
import {
  QUESTIONS_PER_ROUND,
  buildQuestionRound,
  eliminationIndexes,
  type QuestionRound,
} from '../lib/game/question';
import { EXTRA_SECONDS, ROUNDS_PER_GAME } from '../lib/game/rules';
import type { AnswerOutcome, CategoryName, GameMode, PowerupId } from '../lib/game/types';

type LoadState = 'loading' | 'ready' | 'insufficient' | 'error' | 'no-category';

const RETRY_NOTICE = 'Respuesta incorrecta. Se activó tu 2da Chance: ¡tenés otra oportunidad!';

/**
 * The round badge text. A "10 rondas" game that is still playing past the tenth round is
 * in sudden death, which has no fixed denominator to show.
 */
function roundBadgeLabel(round: number, mode: GameMode): string {
  if (mode !== 'rondas') return `Ronda ${round}`;
  return round > ROUNDS_PER_GAME
    ? `Muerte súbita • Ronda ${round}`
    : `Ronda ${round} de ${ROUNDS_PER_GAME}`;
}

/**
 * The cue for one confirmed answer. A crown earned — by the 3-win tally or by a won
 * ultra desafío, which grants one directly — replaces the plain correct sound rather
 * than layering over it.
 */
function answerCue(isCorrect: boolean, ultraChallenge: boolean, outcome: AnswerOutcome): SoundCue {
  if (!isCorrect) return 'incorrect';
  if (ultraChallenge || outcome === 'crown-pick') return 'crown';
  return 'correct';
}

export default function Pregunta() {
  const navigate = useNavigate();
  const {
    state,
    answerQuestion,
    usePowerup: spendPowerup,
    pickCrown,
    startUltraChallenge,
    resolveUltra,
  } = useGame();

  const category: CategoryName | null = state.ultraChallenge ?? state.currentCategory;
  const ultraCategory = state.ultraChallenge;
  const player = state.players[state.currentTurn];

  const [load, setLoad] = useState<LoadState>('loading');
  const [question, setQuestion] = useState<QuestionRound | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [hint, setHint] = useState<QuestionRound['hint'] | null>(null);
  const [wrongSelection, setWrongSelection] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(state.config.timePerTurn);
  const [timerTotal, setTimerTotal] = useState<number>(state.config.timePerTurn);
  const [showUltraPicker, setShowUltraPicker] = useState(false);
  const [cursors, setCursors] = useState<Partial<Record<CategoryName, number>>>({});
  const [reload, setReload] = useState(0);

  const resolvedRef = useRef(true);
  const usedPowerupsRef = useRef<Set<PowerupId>>(new Set());

  const skip = category === null ? 0 : (cursors[category] ?? 0);
  const timePerTurn = state.config.timePerTurn;

  useEffect(() => {
    if (category === null) {
      setLoad('no-category');
      setQuestion(null);
      return;
    }

    let cancelled = false;
    resolvedRef.current = true;
    usedPowerupsRef.current = new Set();
    setLoad('loading');
    setQuestion(null);
    setSelected(null);
    setEliminated([]);
    setHint(null);
    setWrongSelection(false);
    setNotice(null);
    setRemaining(timePerTurn);
    setTimerTotal(timePerTurn);

    getQuestionsByCategory(category, {
      limit: QUESTIONS_PER_ROUND,
      ...(skip > 0 ? { skip } : {}),
    })
      .then((questions) => {
        if (cancelled) return;
        const next = buildQuestionRound(questions);
        setQuestion(next);
        setLoad(next === null ? 'insufficient' : 'ready');
        resolvedRef.current = next === null;
      })
      .catch(() => {
        if (cancelled) return;
        setQuestion(null);
        setLoad('error');
        resolvedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [category, skip, reload, timePerTurn]);

  const prepareRetry = useCallback(() => {
    setWrongSelection(true);
    setNotice(RETRY_NOTICE);
    setSelected(null);
    setRemaining(timePerTurn);
    setTimerTotal(timePerTurn);
    resolvedRef.current = false;
  }, [timePerTurn]);

  const applyOutcome = useCallback(
    (outcome: AnswerOutcome) => {
      switch (outcome) {
        case 'retry':
          prepareRetry();
          return;
        case 'crown-pick':
          return;
        case 'ended':
          navigate('/resultados');
          return;
        case 'continue':
          navigate('/ruleta');
          return;
        default:
          resolvedRef.current = false;
      }
    },
    [navigate, prepareRetry],
  );

  /**
   * An ultra desafío is an extra question inside the turn: resolving it never passes
   * the turn, so a win or a loss reloads the player's own question instead of leaving.
   */
  const applyUltraOutcome = useCallback(
    (outcome: AnswerOutcome) => {
      switch (outcome) {
        case 'retry':
          prepareRetry();
          return;
        case 'ended':
          navigate('/resultados');
          return;
        case 'continue':
          setReload((value) => value + 1);
          resolvedRef.current = true;
          return;
        default:
          resolvedRef.current = false;
      }
    },
    [navigate, prepareRetry],
  );

  const resolveTimeout = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const isUltra = state.ultraChallenge !== null;
    const outcome = isUltra
      ? resolveUltra(false, { allowSecondChance: false })
      : answerQuestion(false, { allowSecondChance: false });
    if (isUltra) applyUltraOutcome(outcome);
    else applyOutcome(outcome);
    playSound('timeout');
  }, [state.ultraChallenge, answerQuestion, resolveUltra, applyOutcome, applyUltraOutcome]);

  const paused = load !== 'ready' || resolvedRef.current || state.awaitingCrown || showUltraPicker;

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      resolveTimeout();
      return;
    }
    const id = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [paused, remaining, resolveTimeout]);

  const handleConfirm = useCallback(() => {
    if (resolvedRef.current || question === null || selected === null) return;
    resolvedRef.current = true;
    const isCorrect = selected === question.correctIndex;
    setWrongSelection(!isCorrect);

    const isUltra = state.ultraChallenge !== null;
    const outcome = isUltra ? resolveUltra(isCorrect) : answerQuestion(isCorrect);
    if (isUltra) applyUltraOutcome(outcome);
    else applyOutcome(outcome);
    // The reducer has already decided the outcome, and the cue is requested last, so a
    // failing audio backend can never change or delay what the answer did.
    playSound(answerCue(isCorrect, isUltra, outcome));
  }, [
    question,
    selected,
    state.ultraChallenge,
    answerQuestion,
    resolveUltra,
    applyOutcome,
    applyUltraOutcome,
  ]);

  const handleSelect = useCallback(
    (index: number) => {
      if (resolvedRef.current || eliminated.includes(index)) return;
      setSelected(index);
      setWrongSelection(false);
    },
    [eliminated],
  );

  const handlePowerup = useCallback(
    (id: PowerupId) => {
      if (resolvedRef.current || question === null) return;
      if (usedPowerupsRef.current.has(id)) return;
      if (!spendPowerup(id)) return;
      usedPowerupsRef.current.add(id);

      if (id === 'fifty-fifty') {
        const removed = eliminationIndexes(question);
        setEliminated(removed);
        setSelected((current) => (current !== null && removed.includes(current) ? null : current));
      }
      if (id === 'hint') {
        setHint(question.hint);
      }
      if (id === 'plus-time') {
        const extended = remaining + EXTRA_SECONDS;
        setRemaining(extended);
        setTimerTotal((total) => Math.max(total, extended));
      }
      if (id === 'skip-question' && category !== null) {
        setCursors((current) => ({ ...current, [category]: (current[category] ?? 0) + 1 }));
      }
      playSound('powerup');
    },
    [question, category, remaining, spendPowerup],
  );

  const handlePickCrown = useCallback(
    (picked: CategoryName) => {
      applyOutcome(pickCrown(picked));
    },
    [pickCrown, applyOutcome],
  );

  const handleStartUltra = useCallback(
    (picked: CategoryName) => {
      setShowUltraPicker(false);
      if (!startUltraChallenge(picked)) return;
      resolvedRef.current = true;
      setReload((value) => value + 1);
      playSound('ultra');
    },
    [startUltraChallenge],
  );

  const roundLabel = roundBadgeLabel(state.round, state.config.mode);

  const ultraActive = ultraCategory !== null;
  const canStartUltra =
    !ultraActive && !state.ultraUsed && !state.awaitingCrown && load === 'ready';
  const locked = load !== 'ready' || state.awaitingCrown;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-6 text-center">
        <span
          data-testid="round-badge"
          className="mb-2 inline-flex items-center gap-2 rounded-full border border-plum bg-plum/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-lime-pastel"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
          Show de TV en Vivo • {roundLabel}
        </span>
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-light-text sm:text-4xl lg:text-5xl">
          ¡Pregunta en Vivo!
        </h1>
        <p className="mt-1 text-xs font-normal text-[#9A9A9A] sm:text-sm">
          {player.name} responde. El tiempo corre: ¡elegí la respuesta correcta!
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="order-2 lg:order-none lg:col-span-3">
          <PlayerArenaCard player={state.players[0]} active={state.currentTurn === 0} />
        </div>

        <div className="order-1 lg:order-none lg:col-span-6">
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-plum/70 bg-[#15111b] p-5 shadow-xl sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-plum/40 to-transparent" />

            <div className="relative z-10 flex flex-wrap items-center gap-2">
              {category !== null && (
                <div
                  data-testid="category-badge"
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    borderColor: `${CATEGORY_COLORS[category]}66`,
                    color: CATEGORY_COLORS[category],
                  }}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    {CATEGORY_ICONS[category]}
                  </span>
                  {CATEGORY_LABELS[category]}
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#ffb703]/40 bg-[#24132c] px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#ffb703]">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  emoji_events
                </span>
                Corona en Juego
              </div>
            </div>

            <TimerBar remaining={remaining} total={timerTotal} />

            <div className="relative z-10 my-6 text-center">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-lime-pastel/70">
                {ultraActive ? 'Ultra Desafío' : 'Pregunta'} • {player.name}
              </span>
              <h2
                data-testid="question-statement"
                className="font-display text-xl font-extrabold leading-snug text-light-text sm:text-2xl"
              >
                {question?.statement ?? 'Cargando pregunta…'}
              </h2>
            </div>

            {load === 'ready' && question !== null && (
              <>
                {notice !== null && <Feedback tone="wrong">{notice}</Feedback>}

                {ultraCategory !== null && (
                  <Feedback tone="info">
                    Ultra Desafío: si acertás te llevás la corona de{' '}
                    {CATEGORY_LABELS[ultraCategory]}. Si fallás, perdés tu racha.
                  </Feedback>
                )}

                {hint !== null && (
                  <div
                    data-testid="hint"
                    className="mb-4 rounded-xl border border-lime-primary/30 bg-lime-primary/5 px-3 py-2 text-center text-xs text-lime-pastel"
                  >
                    Pista: empieza con «{hint.firstChar}» y tiene {hint.length} caracteres.
                  </div>
                )}

                <AnswerGrid
                  options={question.options}
                  selected={selected}
                  eliminated={eliminated}
                  locked={locked}
                  wrongSelection={wrongSelection}
                  onSelect={handleSelect}
                />

                <div className="relative z-10 mb-4">
                  <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#7a7280]">
                    Comodines
                  </p>
                  <PowerupBar
                    inventory={player.powerups}
                    enabled={state.config.powerups}
                    disabled={locked}
                    onUse={handlePowerup}
                  />
                </div>

                <div className="relative z-10 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to="/ruleta"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-plum bg-[#1a1120] px-4 py-3 font-display text-[11px] font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#241830]"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      arrow_back
                    </span>
                    Volver a la Ruleta
                  </Link>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      disabled={!canStartUltra}
                      onClick={() => setShowUltraPicker(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#ffb703]/50 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-[#ffb703] transition-all hover:bg-[#ffb703]/10 disabled:cursor-not-allowed disabled:border-[#333333] disabled:text-[#5c5c5c]"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        local_fire_department
                      </span>
                      Ultra Desafío
                    </button>

                    <button
                      type="button"
                      data-testid="confirm-answer"
                      disabled={selected === null || load !== 'ready' || state.awaitingCrown}
                      onClick={handleConfirm}
                      className="flex items-center justify-center gap-2 rounded-xl bg-lime-primary px-6 py-3 font-display text-xs font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      Confirmar Respuesta
                    </button>
                  </div>
                </div>
              </>
            )}

            {load === 'loading' && (
              <p className="relative z-10 text-center text-xs text-[#9A9A9A]">
                Preparando la pregunta…
              </p>
            )}

            {load === 'insufficient' && (
              <DefensiveState
                title="No hay suficientes preguntas"
                message="Esta categoría todavía no tiene cuatro preguntas disponibles. Probá con otra categoría."
              />
            )}

            {load === 'error' && (
              <DefensiveState
                title="No pudimos cargar la pregunta"
                message="Revisá que el servicio de preguntas esté disponible en localhost:8000."
                onRetry={() => setReload((value) => value + 1)}
              />
            )}

            {load === 'no-category' && (
              <DefensiveState
                title="No hay categoría seleccionada"
                message="Girá la ruleta para que caiga una categoría y volvé a esta pantalla."
              />
            )}
          </div>
        </div>

        <div className="order-3 lg:order-none lg:col-span-3">
          <PlayerArenaCard player={state.players[1]} active={state.currentTurn === 1} />
        </div>
      </div>

      {state.awaitingCrown && <CrownPicker crowns={player.crowns} onPick={handlePickCrown} />}

      {showUltraPicker && (
        <UltraCategoryPicker
          crowns={player.crowns}
          onPick={handleStartUltra}
          onCancel={() => setShowUltraPicker(false)}
        />
      )}
    </section>
  );
}

interface DefensiveStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

function DefensiveState({ title, message, onRetry }: DefensiveStateProps) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-3 rounded-2xl border border-plum/70 bg-[#100b16] p-6 text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-[32px] text-[#ffb703]">
        quiz
      </span>
      <h2 className="font-display text-lg font-bold text-light-text">{title}</h2>
      <p className="max-w-sm text-xs text-[#9A9A9A]">{message}</p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        {onRetry !== undefined && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-plum bg-[#1a1120] px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#241830]"
          >
            Reintentar
          </button>
        )}
        <Link
          to="/ruleta"
          className="rounded-xl bg-lime-primary px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel"
        >
          Volver a la Ruleta
        </Link>
      </div>
    </div>
  );
}
