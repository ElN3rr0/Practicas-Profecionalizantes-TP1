import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import {
  createInitialState,
  emptyPowerupInventory,
  gameReducer,
  GameProvider,
  resolveAnswer,
  resolveForfeit,
  useGame,
} from './GameProvider';
import type { GameAction } from './GameProvider';
import type { GameState } from './types';
import { CONTRARRELOJ_SECONDS } from './rules';
import { patchPlayer, readyGame } from '../../test/gameState';

function start(state: GameState, currentTurn: 0 | 1 = 0): GameState {
  return gameReducer(state, { type: 'game/start', currentTurn, gameId: 'test-game' });
}

describe('createInitialState', () => {
  it('returns the setup state with config defaults', () => {
    const state = createInitialState();

    expect(state.status).toBe('setup');
    expect(state.config).toEqual({
      mode: 'coronas',
      timePerTurn: 20,
      powerups: [],
      language: 'es',
    });
    expect(state.players.map((p) => p.name)).toEqual(['Jugador 1', 'Jugador 2']);
    expect(state.currentTurn).toBe(0);
    expect(state.round).toBe(1);
    expect(state.roundWins).toEqual([0, 0]);
    expect(state.winner).toBeNull();
  });

  it('gives each player an empty powerup inventory', () => {
    const state = createInitialState();

    expect(state.players[0].powerups).toEqual(emptyPowerupInventory());
    expect(state.players[1].powerups).toEqual(emptyPowerupInventory());
  });
});

describe('gameReducer / player/set', () => {
  it('updates only the targeted player', () => {
    const initial = createInitialState();
    const state = gameReducer(initial, {
      type: 'player/set',
      id: 1,
      name: 'Luis',
      avatar: 'rocket_launch',
    });

    expect(state.players[0]).toEqual(initial.players[0]);
    expect(state.players[1].name).toBe('Luis');
    expect(state.players[1].avatar).toBe('rocket_launch');
  });
});

describe('gameReducer / config/set', () => {
  it('replaces the shared config', () => {
    const state = gameReducer(createInitialState(), {
      type: 'config/set',
      config: {
        mode: 'rondas',
        timePerTurn: 30,
        powerups: ['fifty-fifty', 'hint'],
        language: 'es',
      },
    });

    expect(state.config.mode).toBe('rondas');
    expect(state.config.timePerTurn).toBe(30);
    expect(state.config.powerups).toEqual(['fifty-fifty', 'hint']);
  });
});

describe('gameReducer / game/start', () => {
  it('defaults empty and whitespace-only names', () => {
    let state = createInitialState();
    state = gameReducer(state, { type: 'player/set', id: 0, name: '', avatar: 'account_circle' });
    state = gameReducer(state, {
      type: 'player/set',
      id: 1,
      name: '   ',
      avatar: 'account_circle',
    });

    const started = start(state);

    expect(started.players[0].name).toBe('Jugador 1');
    expect(started.players[1].name).toBe('Jugador 2');
  });

  it('keeps entered names and enters the spinning status', () => {
    let state = createInitialState();
    state = gameReducer(state, { type: 'player/set', id: 0, name: 'Ana', avatar: 'smart_toy' });
    state = gameReducer(state, { type: 'player/set', id: 1, name: 'Luis', avatar: 'emoji_events' });

    const started = start(state, 1);

    expect(started.players[0].name).toBe('Ana');
    expect(started.players[1].name).toBe('Luis');
    expect(started.status).toBe('spinning');
    expect(started.currentTurn).toBe(1);
  });

  it('establishes the coronas start state', () => {
    let state = createInitialState();
    state = gameReducer(state, {
      type: 'config/set',
      config: { ...state.config, mode: 'coronas' },
    });

    const started = start(state);

    expect(started.config.mode).toBe('coronas');
    expect(started.players[0].crowns).toEqual([]);
    expect(started.players[0].crownTally).toBe(0);
    expect(started.players[1].crowns).toEqual([]);
    expect(started.players[1].crownTally).toBe(0);
    expect(started.roundWins).toEqual([0, 0]);
    expect(started.winner).toBeNull();
  });

  it('establishes the rondas start state', () => {
    let state = createInitialState();
    state = gameReducer(state, { type: 'config/set', config: { ...state.config, mode: 'rondas' } });

    const started = start(state);

    expect(started.config.mode).toBe('rondas');
    expect(started.round).toBe(1);
    expect(started.roundWins).toEqual([0, 0]);
    expect(started.winner).toBeNull();
  });

  it('initializes each player with one use per selected powerup and zero otherwise', () => {
    let state = createInitialState();
    state = gameReducer(state, {
      type: 'config/set',
      config: {
        mode: 'coronas',
        timePerTurn: 20,
        powerups: ['fifty-fifty', 'hint'],
        language: 'es',
      },
    });

    const started = start(state);

    const expected = { ...emptyPowerupInventory(), 'fifty-fifty': 1, hint: 1 };
    expect(started.players[0].powerups).toEqual(expected);
    expect(started.players[1].powerups).toEqual(expected);
    expect(started.players[0].powerups).not.toBe(started.players[1].powerups);
  });

  it('assigns the provided first turn of 0 or 1', () => {
    expect(start(createInitialState(), 0).currentTurn).toBe(0);
    expect(start(createInitialState(), 1).currentTurn).toBe(1);
  });
});

describe('gameReducer / game/spin', () => {
  it('clears the current category and enters the spinning status', () => {
    let state = start(createInitialState());
    state = gameReducer(state, { type: 'game/land', category: 'arte' });

    const spun = gameReducer(state, { type: 'game/spin' });

    expect(spun.status).toBe('spinning');
    expect(spun.currentCategory).toBeNull();
  });
});

describe('gameReducer / game/land', () => {
  it('records the landed category and enters the answering status', () => {
    const state = gameReducer(start(createInitialState()), {
      type: 'game/land',
      category: 'ciencia',
    });

    expect(state.status).toBe('answering');
    expect(state.currentCategory).toBe('ciencia');
  });
});

/** A game deep into "10 rondas", with every field that reset must clear already written. */
function playedGame(): GameState {
  let state = gameReducer(createInitialState(), {
    type: 'config/set',
    config: { mode: 'rondas', timePerTurn: 30, powerups: ['hint'], language: 'es' },
  });
  state = gameReducer(state, { type: 'player/set', id: 0, name: 'Ana', avatar: 'smart_toy' });
  state = gameReducer(state, { type: 'player/set', id: 1, name: 'Luis', avatar: 'rocket_launch' });
  state = gameReducer(state, { type: 'game/start', currentTurn: 1, gameId: 'test-game' });
  state = gameReducer(state, { type: 'game/land', category: 'historia' });

  return {
    ...state,
    status: 'ended',
    winner: 0,
    round: 12,
    roundWins: [6, 5],
    roundPoints: [100, 0],
    roundAnswers: [1, 1],
    ultraChallenge: 'ciencia',
    awaitingCrown: true,
    retryUsed: true,
    ultraUsed: true,
    players: [
      { ...state.players[0], score: 500, crowns: ['arte'], crownTally: 2 },
      { ...state.players[1], score: 700, crowns: ['historia', 'ciencia'], crownTally: 1 },
    ],
  };
}

describe('gameReducer / game/reset', () => {
  it('returns every field to its initial value', () => {
    const midGame = playedGame();
    expect(midGame).not.toEqual(createInitialState());

    const reset = gameReducer(midGame, { type: 'game/reset' });

    expect(reset).toEqual(createInitialState());
    expect(reset.status).toBe('setup');
    expect(reset.winner).toBeNull();
    expect(reset.players.map((player) => player.name)).toEqual(['Jugador 1', 'Jugador 2']);
    expect(reset.players.map((player) => player.score)).toEqual([0, 0]);
    expect(reset.players.map((player) => player.crowns)).toEqual([[], []]);
  });

  it('keeps the selected language when the game resets', () => {
    const base = createInitialState();
    const withEnglish = { ...base, config: { ...base.config, language: 'en' as const } };

    const reset = gameReducer(withEnglish, { type: 'game/reset' });

    expect(reset.config.language).toBe('en');
    expect(reset.players[0].score).toBe(0);
  });
});

describe('gameReducer / unknown action', () => {
  it('returns the same state unchanged', () => {
    const state = createInitialState();

    const next = gameReducer(state, { type: 'unknown' } as unknown as GameAction);

    expect(next).toBe(state);
  });
});

describe('GameProvider', () => {
  it('throws when useGame is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useGame())).toThrow('useGame must be used within a GameProvider');
    spy.mockRestore();
  });

  it('exposes the setup state through the hook', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    expect(result.current.state.status).toBe('setup');
    expect(result.current.state.config.mode).toBe('coronas');
  });

  it('setPlayer updates the shared state', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.setPlayer(0, { name: 'Ana', avatar: 'smart_toy' });
    });

    expect(result.current.state.players[0].name).toBe('Ana');
    expect(result.current.state.players[0].avatar).toBe('smart_toy');
    expect(result.current.state.players[1].name).toBe('Jugador 2');
  });

  it('startGame assigns a random first turn of 0 or 1', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    randomSpy.mockReturnValue(0.1);
    act(() => {
      result.current.startGame();
    });
    expect(result.current.state.currentTurn).toBe(0);

    randomSpy.mockReturnValue(0.9);
    act(() => {
      result.current.startGame();
    });
    expect(result.current.state.currentTurn).toBe(1);

    randomSpy.mockRestore();
  });

  it('startGame returns true so the caller may navigate', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    let ready: boolean | undefined;
    act(() => {
      ready = result.current.startGame();
    });

    expect(ready).toBe(true);
    expect(result.current.state.status).toBe('spinning');
  });

  it('spin and land dispatch their corresponding state transitions', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.spin();
    });
    expect(result.current.state.status).toBe('spinning');
    expect(result.current.state.currentCategory).toBeNull();

    act(() => {
      result.current.land('geografia');
    });
    expect(result.current.state.status).toBe('answering');
    expect(result.current.state.currentCategory).toBe('geografia');
  });

  it('renders children through the provider', () => {
    function Probe() {
      const { state } = useGame();
      return <output data-testid="probe">{state.status}</output>;
    }

    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('setup');
  });

  it('resetGame returns the shared state to the initial value', () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    act(() => {
      result.current.setPlayer(0, { name: 'Ana', avatar: 'smart_toy' });
      result.current.startGame();
    });
    expect(result.current.state.status).toBe('spinning');
    expect(result.current.state.players[0].name).toBe('Ana');

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.state).toEqual(createInitialState());
  });

  it('mounts on the provided initial state', () => {
    const seeded: GameState = { ...createInitialState(), status: 'ended', winner: 0 };

    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => <GameProvider initialState={seeded}>{children}</GameProvider>,
    });

    expect(result.current.state).toEqual(seeded);
  });
});

describe('gameReducer / Phase 3 modes', () => {
  it('copies equipped cosmetics onto the player and clears them for a guest', () => {
    const withCosmetics = gameReducer(createInitialState(), {
      type: 'player/set',
      id: 0,
      name: 'Ana',
      avatar: 'smart_toy',
      profileId: 'p1',
      cosmetics: { frame: 'frame_gold', title: 'title_novato' },
    });
    expect(withCosmetics.players[0].cosmetics).toEqual({
      frame: 'frame_gold',
      title: 'title_novato',
    });

    const guest = gameReducer(withCosmetics, {
      type: 'player/set',
      id: 0,
      name: 'Ana',
      avatar: 'smart_toy',
      profileId: null,
      cosmetics: null,
    });
    expect(guest.players[0].cosmetics).toBeUndefined();
  });

  it('ends a duel on the first correct answer and passes the turn on a miss', () => {
    const duel = readyGame({ mode: 'duelo' });
    const missed = resolveAnswer(duel, false, false);
    expect(missed.value).toBe('continue');
    expect(missed.state.currentTurn).toBe(1);

    const won = resolveAnswer({ ...duel, currentTurn: 1 }, true);
    expect(won.value).toBe('ended');
    expect(won.state.status).toBe('ended');
    expect(won.state.winner).toBe(1);
  });

  it('never asks for a crown in duelo mode', () => {
    const charged = patchPlayer(readyGame({ mode: 'duelo' }), 0, { crownTally: 2 });
    const step = resolveAnswer(charged, true);

    expect(step.value).toBe('ended');
    expect(step.state.awaitingCrown).toBe(false);
  });

  it('counts down the contrarreloj clock and ends on the score at zero', () => {
    const game = patchPlayer(readyGame({ mode: 'contrarreloj' }), 0, { score: 300 });
    const mid = gameReducer({ ...game, clock: 2 }, { type: 'game/tick' });
    expect(mid.clock).toBe(1);
    expect(mid.status).toBe('answering');

    const ended = gameReducer(mid, { type: 'game/tick' });
    expect(ended.clock).toBe(0);
    expect(ended.status).toBe('ended');
    expect(ended.winner).toBe(0);
  });

  it('ignores the clock outside contrarreloj', () => {
    const game = { ...readyGame({ mode: 'coronas' }), clock: 5 };
    expect(gameReducer(game, { type: 'game/tick' })).toEqual(game);
  });

  it('resets the clock when a new game starts', () => {
    const game = { ...readyGame({ mode: 'contrarreloj' }), clock: 3 };
    const restarted = gameReducer(game, {
      type: 'game/start',
      currentTurn: 0,
      gameId: 'next',
    });
    expect(restarted.clock).toBe(CONTRARRELOJ_SECONDS);
  });

  it('feeds a best-of-three series and keeps it across games', () => {
    const first = resolveAnswer(readyGame({ mode: 'duelo', tournament: true }), true);
    expect(first.state.seriesWins).toEqual([1, 0]);

    const next = gameReducer(first.state, {
      type: 'game/start',
      currentTurn: 0,
      gameId: 'series-game-2',
    });
    expect(next.seriesWins).toEqual([1, 0]);

    const reset = gameReducer(next, {
      type: 'game/start',
      currentTurn: 0,
      gameId: 'series-game-3',
      resetSeries: true,
    });
    expect(reset.seriesWins).toEqual([0, 0]);
  });

  it('does not feed a series unless the tournament toggle is on', () => {
    const step = resolveAnswer(readyGame({ mode: 'duelo' }), true);
    expect(step.state.seriesWins).toEqual([0, 0]);
  });

  it('resets the series when the mode or tournament flag changes', () => {
    const base = createInitialState();
    const inSeries: GameState = {
      ...base,
      config: { ...base.config, tournament: true },
      seriesWins: [1, 0],
    };

    expect(
      gameReducer(inSeries, {
        type: 'config/set',
        config: { ...inSeries.config, mode: 'duelo' },
      }).seriesWins,
    ).toEqual([0, 0]);

    expect(
      gameReducer(inSeries, {
        type: 'config/set',
        config: { ...inSeries.config, tournament: false },
      }).seriesWins,
    ).toEqual([0, 0]);

    expect(
      gameReducer(inSeries, {
        type: 'config/set',
        config: { ...inSeries.config, timePerTurn: 30 },
      }).seriesWins,
    ).toEqual([1, 0]);
  });
});

describe('gameReducer / question/used', () => {
  it('records each question once and resets the history on a new game', () => {
    let state = gameReducer(createInitialState(), { type: 'question/used', id: 'q1' });
    state = gameReducer(state, { type: 'question/used', id: 'q1' });
    state = gameReducer(state, { type: 'question/used', id: 'q2' });

    expect(state.usedQuestionIds).toEqual(['q1', 'q2']);
    expect(start(state).usedQuestionIds).toEqual([]);
  });
});

describe('resolveForfeit', () => {
  it('ends the game and gives the win to the rival', () => {
    const step = resolveForfeit(readyGame({ mode: 'coronas' }, 0));

    expect(step.value).toBe(true);
    expect(step.state.status).toBe('ended');
    expect(step.state.winner).toBe(1);
    expect(step.state.retiredBy).toBe(0);
  });

  it('credits the series when a tournament is on', () => {
    const step = resolveForfeit(readyGame({ mode: 'duelo', tournament: true }, 1));

    expect(step.state.winner).toBe(0);
    expect(step.state.seriesWins).toEqual([1, 0]);
  });

  it('is a no-op once the game has ended', () => {
    const ended = { ...readyGame(), status: 'ended' as const, winner: 0 as const };
    const step = resolveForfeit(ended);

    expect(step.value).toBe(false);
    expect(step.state).toEqual(ended);
  });
});
