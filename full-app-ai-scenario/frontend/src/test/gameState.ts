import { createInitialState, gameReducer } from '../lib/game/GameProvider';
import type {
  CategoryName,
  GameConfig,
  GameMode,
  GameState,
  GameStatus,
  Player,
  PowerupId,
} from '../lib/game/types';

type PlayerPatch = Partial<Omit<Player, 'id'>>;

/** A started game whose inventories match the configured powerups. */
export function startedGame(config: Partial<GameConfig> = {}, currentTurn: 0 | 1 = 0): GameState {
  const initial = createInitialState();
  const configured = gameReducer(initial, {
    type: 'config/set',
    config: { ...initial.config, ...config },
  });
  return gameReducer(configured, { type: 'game/start', currentTurn, gameId: 'test-game' });
}

/** A started game already on the question screen for `category`. */
export function readyGame(
  config: Partial<GameConfig> = {},
  currentTurn: 0 | 1 = 0,
  category: CategoryName = 'arte',
): GameState {
  return gameReducer(startedGame(config, currentTurn), { type: 'game/land', category });
}

export function patchPlayer(state: GameState, id: 0 | 1, patch: PlayerPatch): GameState {
  const players: [Player, Player] = [
    id === 0 ? { ...state.players[0], ...patch } : state.players[0],
    id === 1 ? { ...state.players[1], ...patch } : state.players[1],
  ];
  return { ...state, players };
}

export function withPowerups(
  state: GameState,
  id: 0 | 1,
  counts: Partial<Record<PowerupId, number>>,
): GameState {
  return patchPlayer(state, id, {
    powerups: { ...state.players[id].powerups, ...counts },
  });
}

interface FinishedGamePatch {
  mode?: GameMode;
  status?: GameStatus;
  winner?: 0 | 1 | null;
  names?: [string, string];
  scores?: [number, number];
  crowns?: [CategoryName[], CategoryName[]];
  roundWins?: [number, number];
  tournament?: boolean;
  seriesWins?: [number, number];
}

/** A game whose result is already recorded, ready for the results screen. */
export function finishedGame({
  mode = 'coronas',
  status = 'ended',
  winner = null,
  names,
  scores = [0, 0],
  crowns = [[], []],
  roundWins = [0, 0],
  tournament = false,
  seriesWins = [0, 0],
}: FinishedGamePatch = {}): GameState {
  const base = createInitialState();
  const state: GameState = {
    ...base,
    config: { ...base.config, mode, tournament },
    status,
    winner,
    roundWins,
    seriesWins,
  };

  const withPlayers = patchPlayer(state, 0, {
    name: names?.[0] ?? base.players[0].name,
    score: scores[0],
    crowns: crowns[0],
  });

  return patchPlayer(withPlayers, 1, {
    name: names?.[1] ?? base.players[1].name,
    score: scores[1],
    crowns: crowns[1],
  });
}
