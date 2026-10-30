import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Flipper from '../components/ruleta/Flipper';
import PlayerStatusCard from '../components/ruleta/PlayerStatusCard';
import ResultModal from '../components/ruleta/ResultModal';
import Wheel from '../components/ruleta/Wheel';
import { getCategories } from '../lib/api/client';
import type { Category } from '../lib/api/types';
import { playSound } from '../lib/audio';
import { CATEGORY_LABELS } from '../lib/constants/categories';
import { useGame } from '../lib/game/GameProvider';
import {
  nextRotation,
  resolveCategory,
  SPIN_DURATION_MS,
  WHEEL_CATEGORIES,
} from '../lib/game/spin';
import type { CategoryName } from '../lib/game/types';

const BULB_POSITIONS = Array.from({ length: 12 }, (_, index) => {
  const radians = (index * 30 * Math.PI) / 180;
  return {
    left: `${50 + 46 * Math.sin(radians)}%`,
    top: `${50 - 46 * Math.cos(radians)}%`,
    lit: index % 2 === 0,
  };
});

/**
 * Validates that the API returned exactly six unique canonical names and, when it
 * did, returns them in canonical `WHEEL_CATEGORIES` order (not the API's order), so
 * the painted wheel and the resolver always share one source of truth.
 */
function normalizeCategories(list: Category[]): CategoryName[] | null {
  const canonical = new Set<string>(WHEEL_CATEGORIES);
  const names = list.map((category) => category.name);
  const unique = new Set(names);
  if (names.length !== WHEEL_CATEGORIES.length) return null;
  if (unique.size !== WHEEL_CATEGORIES.length) return null;
  if (!names.every((name) => canonical.has(name))) return null;
  return [...WHEEL_CATEGORIES];
}

export default function Ruleta() {
  const navigate = useNavigate();
  const { state, spin, land } = useGame();

  const [categories, setCategories] = useState<CategoryName[]>(() => [...WHEEL_CATEGORIES]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const spinningRef = useRef(false);
  const rotationRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => {
        if (!cancelled) setCategories(normalizeCategories(list) ?? [...WHEEL_CATEGORIES]);
      })
      .catch(() => {
        if (!cancelled) setCategories([...WHEEL_CATEGORIES]);
      });
    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setIsSpinning(true);
    setShowResult(false);
    spin();

    const offset = Math.floor(Math.random() * 360);
    const next = nextRotation(rotationRef.current, offset);
    rotationRef.current = next;
    setRotation(next);

    timeoutRef.current = window.setTimeout(() => {
      land(resolveCategory(next));
      spinningRef.current = false;
      setIsSpinning(false);
      setShowResult(true);
      playSound('wheel-land');
    }, SPIN_DURATION_MS);

    playSound('wheel-spin');
  }, [spin, land]);

  const handlePlay = useCallback(() => {
    setShowResult(false);
    navigate('/pregunta');
  }, [navigate]);

  const handleRespin = useCallback(() => {
    setShowResult(false);
  }, []);

  const currentCategory = state.currentCategory;
  const statusLabel = isSpinning
    ? '¡Girando la ruleta a máxima velocidad!'
    : showResult && currentCategory !== null
      ? `¡Resultado: ${CATEGORY_LABELS[currentCategory]}!`
      : 'Turno activo: Pulsa el botón central para girar.';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-light-text sm:text-4xl lg:text-5xl">
          ¡Gran Ruleta Arcade!
        </h1>
        <p className="mt-1 text-xs font-normal text-[#9A9A9A] sm:text-sm">
          {state.players[state.currentTurn].name} tiene el pulsador listo. ¡Haz girar la rueda y
          descifra la pregunta!
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-3">
          <PlayerStatusCard id={0} active={state.currentTurn === 0} />
        </div>

        <div className="order-1 my-2 flex flex-col items-center justify-center lg:order-2 lg:col-span-6 lg:my-0">
          <div className="relative flex h-[340px] w-[340px] items-center justify-center sm:h-[420px] sm:w-[420px]">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#9D4EDD]/20 via-[#B0F280]/15 to-[#FF6B35]/20 blur-2xl" />

            <Flipper spinning={isSpinning} />

            <div className="relative flex h-full w-full items-center justify-center rounded-full border-4 border-plum bg-gradient-to-b from-[#2a1d38] via-[#150f1f] to-[#0a070e] p-3 shadow-[0_0_35px_rgba(0,0,0,0.9),inset_0_0_18px_rgba(0,0,0,0.9)] sm:p-4">
              <div className="pointer-events-none absolute inset-1 rounded-full">
                {BULB_POSITIONS.map((bulb, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      bulb.lit ? 'bulb-glow-a bg-lime-primary' : 'bulb-glow-b bg-[#fde047]'
                    }`}
                    style={{ left: bulb.left, top: bulb.top }}
                  />
                ))}
              </div>

              <Wheel categories={categories} rotation={rotation} />
            </div>

            <button
              type="button"
              aria-label="Girar Ruleta"
              onClick={handleSpin}
              disabled={isSpinning}
              className="absolute inset-0 z-20 m-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-[3px] border-lime-primary bg-gradient-to-b from-[#2e153b] via-[#1c0d24] to-[#120818] text-center shadow-[0_0_25px_rgba(176,242,128,0.5),inset_0_0_12px_rgba(176,242,128,0.3)] transition-all hover:shadow-[0_0_35px_rgba(176,242,128,0.8)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-75 sm:h-32 sm:w-32 sm:border-4"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[28px] text-lime-primary sm:text-[34px]"
              >
                casino
              </span>
              <span className="mt-0.5 font-display text-[10px] font-extrabold uppercase leading-tight tracking-wider text-light-text sm:text-xs">
                ¡Girar
                <br />
                <span className="font-bold text-lime-primary">Ruleta!</span>
              </span>
            </button>
          </div>

          <div className="mt-4 flex w-full max-w-md items-center justify-between rounded-xl border border-plum bg-[#140e1c] px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-3 w-3 rounded-full ${
                  isSpinning ? 'animate-ping bg-[#fde047]' : 'animate-pulse bg-lime-primary'
                }`}
              />
              <span className="text-xs font-medium text-[#a09aa7]">{statusLabel}</span>
            </div>
            <span className="rounded border border-[#23182d] bg-[#0c0812] px-2 py-0.5 font-mono text-[11px] text-[#8a8194]">
              {state.config.timePerTurn}s turno
            </span>
          </div>
        </div>

        <div className="order-3 lg:col-span-3">
          <PlayerStatusCard id={1} active={state.currentTurn === 1} />
        </div>
      </div>

      {showResult && currentCategory !== null && (
        <ResultModal
          category={currentCategory}
          playerName={state.players[state.currentTurn].name}
          onPlay={handlePlay}
          onRespin={handleRespin}
        />
      )}
    </section>
  );
}
