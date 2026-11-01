import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Question } from '../lib/api/types';
import { playSound } from '../lib/audio';
import { GameProvider, useGame } from '../lib/game/GameProvider';
import type { GameContextValue } from '../lib/game/GameProvider';
import type { CategoryName, GameConfig, GameState } from '../lib/game/types';
import { readyGame } from '../test/gameState';
import Pregunta from './Pregunta';

vi.mock('../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio')>();
  return { ...actual, playSound: vi.fn() };
});

const playMock = vi.mocked(playSound);

beforeEach(() => {
  playMock.mockReset();
});

const QUESTIONS: Question[] = [
  { id: 1, question: '¿Quién pintó la Gioconda?', answer: 'Leonardo da Vinci' },
  { id: 2, question: '¿Dónde se exhibe la Gioconda?', answer: 'El Louvre' },
  { id: 3, question: '¿Quién pintó el Guernica?', answer: 'Picasso' },
  { id: 4, question: '¿Quién pintó La noche estrellada?', answer: 'Van Gogh' },
];

const SKIPPED_QUESTIONS: Question[] = [
  { id: 5, question: '¿Quién esculpió el David?', answer: 'Miguel Ángel' },
  { id: 6, question: '¿En qué museo está el David?', answer: 'La Academia' },
  { id: 7, question: '¿Quién pintó Las meninas?', answer: 'Velázquez' },
  { id: 8, question: '¿Quién pintó El jardín de las delicias?', answer: 'El Bosco' },
];

function StateProbe() {
  const { state } = useGame();
  return <output data-testid="state-probe">{JSON.stringify(state)}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

function SeedGame({
  seed,
  children,
}: {
  seed: (game: GameContextValue) => void;
  children: ReactNode;
}) {
  const game = useGame();
  const gameRef = useRef(game);
  gameRef.current = game;
  const started = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    seed(gameRef.current);
    setReady(true);
  }, [seed]);

  return ready ? <>{children}</> : null;
}

function readState(): GameState {
  return JSON.parse(screen.getByTestId('state-probe').textContent ?? '') as GameState;
}

function pathname(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function seedStart(config: Partial<Omit<GameConfig, 'language'>> = {}) {
  return (game: GameContextValue) => {
    game.setConfig({ mode: 'coronas', timePerTurn: 20, powerups: [], language: 'es', ...config });
    game.startGame();
    game.land('arte');
  };
}

/** Two correct answers for player 0, each followed by a wrong one from player 1. */
function seedCrownTally(tally: number) {
  return (game: GameContextValue) => {
    seedStart()(game);
    for (let index = 0; index < tally; index += 1) {
      game.answerQuestion(true);
      game.answerQuestion(false);
    }
  };
}

/** Player 0 holds five crowns with a tally of two, one correct answer from the win. */
function seedFiveCrowns() {
  const picks = ['arte', 'historia', 'deportes', 'entretenimiento', 'geografia'] as const;
  return (game: GameContextValue) => {
    seedStart()(game);
    for (const category of picks) {
      game.answerQuestion(true);
      game.answerQuestion(false);
      game.answerQuestion(true);
      game.answerQuestion(false);
      game.answerQuestion(true);
      game.pickCrown(category);
      game.answerQuestion(false);
    }
    game.answerQuestion(true);
    game.answerQuestion(false);
    game.answerQuestion(true);
    game.answerQuestion(false);
  };
}

/** Player 0 is at the 3-win moment: a crown is owed, which also unlocks the ultra. */
function crownMoment(
  config: Partial<Omit<GameConfig, 'language'>> = {},
  crowns: CategoryName[] = [],
): GameState {
  const base = readyGame({ language: 'es', ...config });
  return {
    ...base,
    awaitingCrown: true,
    players: [{ ...base.players[0], crownTally: 3, crowns: [...crowns] }, base.players[1]],
  };
}

function stubQuestions(questions: Question[] = QUESTIONS) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const body = url.includes('skip=') ? SKIPPED_QUESTIONS : questions;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function flush(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
}

function renderPage(
  seed: (game: GameContextValue) => void = seedStart(),
  initialState?: GameState,
) {
  return render(
    <GameProvider initialState={initialState}>
      <MemoryRouter initialEntries={['/pregunta']}>
        <StateProbe />
        <LocationProbe />
        <SeedGame seed={seed}>
          <Routes>
            <Route path="/pregunta" element={<Pregunta />} />
            <Route path="/ruleta" element={<div>ruleta</div>} />
            <Route path="/resultados" element={<div>resultados</div>} />
          </Routes>
        </SeedGame>
      </MemoryRouter>
    </GameProvider>,
  );
}

function option(index: number) {
  return screen.getByTestId(`answer-option-${index}`);
}

function confirmButton() {
  return screen.getByTestId('confirm-answer');
}

function advanceSeconds(seconds: number) {
  for (let index = 0; index < seconds; index += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('Pregunta', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches four questions and renders one statement with exactly one correct option', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    const fetchMock = stubQuestions();

    renderPage();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/questions/category/arte?limit=4&lang=es',
    );
    expect(screen.getByTestId('question-statement')).toHaveTextContent('¿Quién pintó la Gioconda?');
    expect(screen.getByTestId('category-badge')).toHaveTextContent('Arte');
    expect(screen.getByText('Corona en Juego')).toBeInTheDocument();
    expect(screen.getByTestId('arena-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('arena-card-1')).toBeInTheDocument();

    const options = [0, 1, 2, 3].map(option);
    expect(options).toHaveLength(4);
    expect(
      options.filter((element) => element.textContent?.includes('Leonardo da Vinci')),
    ).toHaveLength(1);
    expect(screen.getByTestId('countdown')).toHaveTextContent('20');
  });

  it('requests questions in the selected language', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    const fetchMock = stubQuestions();

    renderPage((game) => {
      game.setConfig({ mode: 'coronas', timePerTurn: 20, powerups: [], language: 'en' });
      game.startGame();
      game.land('arte');
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/questions/category/arte?limit=4&lang=en',
    );
  });

  it('shows the defensive state when the category has fewer than four questions', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions(QUESTIONS.slice(0, 3));

    renderPage();
    await flush();

    expect(screen.getByText('No hay suficientes preguntas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la Ruleta' })).toHaveAttribute(
      'href',
      '/ruleta',
    );
    expect(screen.queryByTestId('answer-option-0')).not.toBeInTheDocument();
  });

  it('offers a retry when the questions request fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    await flush();

    expect(screen.getByText('No pudimos cargar la pregunta')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not advance when confirming with no selection', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());

    const state = readState();
    expect(state.currentTurn).toBe(0);
    expect(state.players[0].score).toBe(0);
    expect(pathname()).toBe('/pregunta');
  });

  it('awards the correct answer to the answering player and returns to the wheel', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    fireEvent.click(option(0));
    expect(option(0)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(confirmButton());

    const state = readState();
    expect(state.players[0].score).toBe(100);
    expect(state.players[1].score).toBe(0);
    expect(state.players[0].crownTally).toBe(1);
    expect(state.players[1].crownTally).toBe(0);
    expect(state.currentTurn).toBe(1);
    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('¡Correcto!');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(pathname()).toBe('/ruleta');
  });

  it('awards nothing on a wrong answer and still passes the turn once', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    fireEvent.click(option(1));
    fireEvent.click(confirmButton());

    const state = readState();
    expect(state.players[0].score).toBe(0);
    expect(state.players[1].score).toBe(0);
    expect(state.currentTurn).toBe(1);
    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Incorrecto');
    expect(screen.getByTestId('feedback-correct-answer')).toHaveTextContent('Leonardo da Vinci');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(pathname()).toBe('/ruleta');
  });

  it('treats a timeout as an incorrect answer and returns to the wheel', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    advanceSeconds(20);

    const state = readState();
    expect(state.players[0].score).toBe(0);
    expect(state.currentTurn).toBe(1);
    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Se acabó el tiempo');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(pathname()).toBe('/ruleta');
  });

  it('runs the countdown from the configured time per turn', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ timePerTurn: 30 }));
    await flush();

    expect(screen.getByTestId('countdown')).toHaveTextContent('30');
    advanceSeconds(10);
    expect(screen.getByTestId('countdown')).toHaveTextContent('20');
  });

  it('re-presents the same question once when a 2da Chance is available', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ powerups: ['second-chance'] }));
    await flush();

    fireEvent.click(option(1));
    fireEvent.click(confirmButton());

    expect(screen.getByTestId('feedback-wrong')).toHaveTextContent('2da Chance');
    expect(screen.getByTestId('question-statement')).toHaveTextContent('¿Quién pintó la Gioconda?');
    expect(screen.getByTestId('countdown')).toHaveTextContent('20');
    expect(readState().currentTurn).toBe(0);
    expect(readState().players[0].powerups['second-chance']).toBe(0);
    expect(pathname()).toBe('/pregunta');

    fireEvent.click(option(2));
    fireEvent.click(confirmButton());

    expect(readState().currentTurn).toBe(1);
    expect(readState().players[0].score).toBe(0);
    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Incorrecto');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(pathname()).toBe('/ruleta');
  });

  it('50/50 disables two wrong options and never the correct one', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ powerups: ['fifty-fifty'] }));
    await flush();

    fireEvent.click(screen.getByTestId('powerup-fifty-fifty'));

    expect(option(0)).toBeEnabled();
    expect(option(1)).toBeDisabled();
    expect(option(2)).toBeDisabled();
    expect(option(3)).toBeEnabled();
    expect(readState().players[0].powerups['fifty-fifty']).toBe(0);
    expect(screen.getByTestId('powerup-fifty-fifty')).toBeDisabled();
  });

  it('+15s extends the running countdown', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ powerups: ['plus-time'] }));
    await flush();

    advanceSeconds(5);
    expect(screen.getByTestId('countdown')).toHaveTextContent('15');

    fireEvent.click(screen.getByTestId('powerup-plus-time'));

    expect(screen.getByTestId('countdown')).toHaveTextContent('30');
    expect(readState().players[0].powerups['plus-time']).toBe(0);
  });

  it('Pista reveals the first character and the length of the correct answer', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ powerups: ['hint'] }));
    await flush();

    fireEvent.click(screen.getByTestId('powerup-hint'));

    expect(screen.getByTestId('hint')).toHaveTextContent('empieza con «L» y tiene 17 caracteres');
    expect(readState().players[0].powerups.hint).toBe(0);
  });

  it('Pasa la pregunta fetches another question in the same category', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    const fetchMock = stubQuestions();

    renderPage(seedStart({ powerups: ['skip-question'] }));
    await flush();

    fireEvent.click(screen.getByTestId('powerup-skip-question'));
    await flush();

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:8000/questions/category/arte?skip=1&limit=4&lang=es',
    );
    expect(screen.getByTestId('question-statement')).toHaveTextContent('¿Quién esculpió el David?');
    expect(readState().currentTurn).toBe(0);
    expect(readState().players[0].score).toBe(0);
    expect(readState().players[0].powerups['skip-question']).toBe(0);
  });

  it('disables the comodines the game did not enable', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    expect(screen.getByTestId('powerup-fifty-fifty')).toBeDisabled();
    expect(screen.getByTestId('powerup-hint')).toBeDisabled();
  });

  it('starts the ultra from the 3-win moment and grants the crown on a win', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    const fetchMock = stubQuestions();

    renderPage(() => {}, crownMoment());
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/questions/category/ciencia?limit=4&lang=es',
    );
    expect(readState().ultraChallenge).toBe('ciencia');

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());
    await flush();

    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('¡Correcto!');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const state = readState();
    expect(state.players[0].crowns).toEqual(['ciencia']);
    expect(state.ultraChallenge).toBeNull();
    expect(state.currentTurn).toBe(1);
    expect(pathname()).toBe('/ruleta');
  });

  it('a timeout on an ultra desafío resets the tally and passes the turn', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, crownMoment());
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    advanceSeconds(20);
    await flush();

    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Se acabó el tiempo');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const state = readState();
    expect(state.ultraChallenge).toBeNull();
    expect(state.currentTurn).toBe(1);
    expect(state.players[0].crowns).toEqual([]);
    expect(pathname()).toBe('/ruleta');
  });

  it('an ultra win on the last missing crown ends the game', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(
      () => {},
      crownMoment({}, ['arte', 'historia', 'deportes', 'entretenimiento', 'geografia']),
    );
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());
    await flush();

    const state = readState();
    expect(state.status).toBe('ended');
    expect(state.winner).toBe(0);
    expect(state.players[0].crowns).toHaveLength(6);
    expect(screen.getByTestId('answer-feedback')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(pathname()).toBe('/resultados');
  });

  it('applies the 2da Chance to an ultra desafío and the loss resets the tally', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, crownMoment({ powerups: ['second-chance'] }));
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    fireEvent.click(option(1));
    fireEvent.click(confirmButton());

    expect(screen.getByTestId('feedback-wrong')).toHaveTextContent('2da Chance');
    expect(readState().ultraChallenge).toBe('ciencia');
    expect(readState().currentTurn).toBe(0);
    expect(readState().players[0].powerups['second-chance']).toBe(0);
    expect(readState().players[0].crownTally).toBe(3);

    fireEvent.click(option(2));
    fireEvent.click(confirmButton());
    await flush();

    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Incorrecto');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const state = readState();
    expect(state.ultraChallenge).toBeNull();
    expect(state.players[0].crownTally).toBe(0);
    expect(state.players[0].crowns).toEqual([]);
    expect(state.currentTurn).toBe(1);
    expect(pathname()).toBe('/ruleta');
  });

  it('makes the crown holder choose an unheld category before the turn continues', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedCrownTally(2));
    await flush();

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());

    const dialog = screen.getByRole('dialog', { name: 'Elegí tu corona' });
    expect(readState().awaitingCrown).toBe(true);
    expect(readState().currentTurn).toBe(0);
    expect(readState().players[0].score).toBe(300);

    fireEvent.click(within(dialog).getByTestId('crown-option-ciencia'));

    const state = readState();
    expect(state.players[0].crowns).toEqual(['ciencia']);
    expect(state.players[0].crownTally).toBe(0);
    expect(state.currentTurn).toBe(1);
    expect(pathname()).toBe('/ruleta');
  });

  it('navigates to the results screen when the final crown ends the game', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedFiveCrowns());
    await flush();

    expect(readState().players[0].crowns).toHaveLength(5);

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());

    // The result box shows first; continue to reach the crown picker.
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const dialog = screen.getByRole('dialog', { name: 'Elegí tu corona' });
    fireEvent.click(within(dialog).getByTestId('crown-option-ciencia'));

    const state = readState();
    expect(state.status).toBe('ended');
    expect(state.winner).toBe(0);
    expect(state.players[0].crowns).toHaveLength(6);
    expect(pathname()).toBe('/resultados');
  });

  it('labels the regulation rounds with the round total in rondas mode', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, { ...readyGame({ mode: 'rondas' }), round: 3 });
    await flush();

    expect(screen.getByTestId('round-badge')).toHaveTextContent('Ronda 3 de 10');
  });

  it('labels a round past the tenth as sudden death, never with a ten-round total', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, { ...readyGame({ mode: 'rondas' }), round: 11, roundWins: [5, 5] });
    await flush();

    const badge = screen.getByTestId('round-badge');
    expect(badge).toHaveTextContent('Muerte súbita');
    expect(badge).toHaveTextContent('Ronda 11');
    expect(badge).not.toHaveTextContent('de 10');
  });

  it('requests the correct cue for a right answer and nothing else', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());

    expect(playMock.mock.calls).toEqual([['correct']]);
  });

  it('requests the incorrect cue for a wrong answer', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    fireEvent.click(option(1));
    fireEvent.click(confirmButton());

    expect(playMock.mock.calls).toEqual([['incorrect']]);
  });

  it('requests the timeout cue when the countdown reaches zero', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    advanceSeconds(20);

    expect(playMock.mock.calls).toEqual([['timeout']]);
  });

  it('requests the crown cue instead of correct when the answer earns a crown', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedCrownTally(2));
    await flush();

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());

    expect(playMock.mock.calls).toEqual([['crown']]);
    expect(screen.getByRole('dialog', { name: 'Elegí tu corona' })).toBeInTheDocument();
  });

  it('requests the ultra cue when the desafío starts and the crown cue on a win', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, crownMoment());
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();
    expect(playMock.mock.calls).toEqual([['ultra']]);

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());
    await flush();

    expect(playMock.mock.calls).toEqual([['ultra'], ['crown']]);
    expect(readState().players[0].crowns).toEqual(['ciencia']);
  });

  it('requests the incorrect cue for a lost ultra desafío', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, crownMoment());
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    fireEvent.click(option(1));
    fireEvent.click(confirmButton());
    await flush();

    expect(playMock.mock.calls).toEqual([['ultra'], ['incorrect']]);
    expect(readState().ultraChallenge).toBeNull();
  });

  it('requests the timeout cue when an ultra desafío runs out of time', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(() => {}, crownMoment());
    await flush();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('crown-option-ciencia'));
    await flush();

    advanceSeconds(20);
    await flush();

    expect(playMock.mock.calls).toEqual([['ultra'], ['timeout']]);
    expect(readState().ultraChallenge).toBeNull();
  });

  it('requests the powerup cue only when a comodín is actually spent', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage(seedStart({ powerups: ['hint'] }));
    await flush();

    fireEvent.click(screen.getByTestId('powerup-hint'));
    expect(playMock.mock.calls).toEqual([['powerup']]);

    fireEvent.click(screen.getByTestId('powerup-hint'));
    expect(playMock.mock.calls).toEqual([['powerup']]);
  });

  it('requests no cue for a comodín the game did not enable', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();

    renderPage();
    await flush();

    fireEvent.click(screen.getByTestId('powerup-fifty-fifty'));

    expect(playMock).not.toHaveBeenCalled();
  });

  it('records the answer and passes the turn once when the cue throws', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.999);
    stubQuestions();
    playMock.mockImplementation(() => {
      throw new Error('audio backend refused');
    });
    // React re-reports a handler exception to the window, which jsdom turns into a failed
    // run. The point of this test is the committed game state, not the escaped report.
    const swallow = (event: Event) => event.preventDefault();
    window.addEventListener('error', swallow);

    renderPage();
    await flush();

    fireEvent.click(option(0));
    fireEvent.click(confirmButton());

    const state = readState();
    expect(playMock).toHaveBeenCalledWith('correct');
    expect(state.players[0].score).toBe(100);
    expect(state.currentTurn).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(pathname()).toBe('/ruleta');

    window.removeEventListener('error', swallow);
  });
});
