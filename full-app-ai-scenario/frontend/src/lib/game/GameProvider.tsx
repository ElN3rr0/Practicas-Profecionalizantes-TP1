import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  POINTS_PER_CORRECT_ANSWER,
  TALLY_TO_EARN_CROWN,
  isGameOver,
  roundWinner,
  stateWinner,
  withCrown,
} from './rules';
import { DEFAULT_LANGUAGE, readStoredLanguage, storeLanguage } from './language';
import type {
  AnswerOutcome,
  AvatarId,
  CategoryName,
  GameConfig,
  GameState,
  Player,
  PowerupId,
  PowerupInventory,
} from './types';

/** Canonical order for the five powerups. Shared by inventory init and the config UI. */
export const POWERUP_IDS: readonly PowerupId[] = [
  'fifty-fifty',
  'second-chance',
  'plus-time',
  'skip-question',
  'hint',
];

export const DEFAULT_PLAYER_NAMES: readonly [string, string] = ['Jugador 1', 'Jugador 2'];

/** Bundled Material Symbols icon names used as avatars. The last entry is the default mark. */
export const PLAYER_AVATARS: Record<0 | 1, readonly AvatarId[]> = {
  0: ['smart_toy', 'psychology', 'account_circle'],
  1: ['emoji_events', 'rocket_launch', 'account_circle'],
};

const DEFAULT_AVATARS: readonly [AvatarId, AvatarId] = ['account_circle', 'account_circle'];

export function emptyPowerupInventory(): PowerupInventory {
  return {
    'fifty-fifty': 0,
    'second-chance': 0,
    'plus-time': 0,
    'skip-question': 0,
    hint: 0,
  };
}

function buildPowerupInventory(selected: readonly PowerupId[]): PowerupInventory {
  const inventory = emptyPowerupInventory();
  for (const id of selected) {
    inventory[id] = 1;
  }
  return inventory;
}

function mapPlayers(
  players: [Player, Player],
  update: (player: Player) => Player,
): [Player, Player] {
  return [update(players[0]), update(players[1])];
}

function updatePlayer(
  players: [Player, Player],
  id: 0 | 1,
  update: (player: Player) => Player,
): [Player, Player] {
  return [id === 0 ? update(players[0]) : players[0], id === 1 ? update(players[1]) : players[1]];
}

function nextTurn(turn: 0 | 1): 0 | 1 {
  return turn === 0 ? 1 : 0;
}

function createPlayer(id: 0 | 1, name: string): Player {
  return {
    id,
    name,
    avatar: DEFAULT_AVATARS[id],
    score: 0,
    crowns: [],
    crownTally: 0,
    powerups: emptyPowerupInventory(),
  };
}

export function createInitialState(): GameState {
  return {
    players: [createPlayer(0, DEFAULT_PLAYER_NAMES[0]), createPlayer(1, DEFAULT_PLAYER_NAMES[1])],
    config: { mode: 'coronas', timePerTurn: 20, powerups: [], language: DEFAULT_LANGUAGE },
    currentTurn: 0,
    round: 1,
    roundWins: [0, 0],
    winner: null,
    ultraChallenge: null,
    status: 'setup',
    currentCategory: null,
    roundPoints: [0, 0],
    roundAnswers: [0, 0],
    awaitingCrown: false,
    retryUsed: false,
    ultraUsed: false,
  };
}

/** Initial state seeded with the player's persisted language preference. */
function initialGameState(): GameState {
  const base = createInitialState();
  return { ...base, config: { ...base.config, language: readStoredLanguage() } };
}

export type GameAction =
  | { type: 'player/set'; id: 0 | 1; name: string; avatar: AvatarId }
  | { type: 'config/set'; config: GameConfig }
  | { type: 'game/reset' }
  | { type: 'game/start'; currentTurn: 0 | 1 }
  | { type: 'game/spin' }
  | { type: 'game/land'; category: CategoryName };

function startGameState(state: GameState, currentTurn: 0 | 1): GameState {
  const players = mapPlayers(state.players, (player) => ({
    ...player,
    name: player.name.trim() === '' ? DEFAULT_PLAYER_NAMES[player.id] : player.name,
    score: 0,
    crowns: [],
    crownTally: 0,
    powerups: buildPowerupInventory(state.config.powerups),
  }));

  return {
    ...state,
    players,
    currentTurn,
    round: 1,
    roundWins: [0, 0],
    winner: null,
    ultraChallenge: null,
    status: 'spinning',
    currentCategory: null,
    roundPoints: [0, 0],
    roundAnswers: [0, 0],
    awaitingCrown: false,
    retryUsed: false,
    ultraUsed: false,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'player/set':
      return {
        ...state,
        players: mapPlayers(state.players, (player) =>
          player.id === action.id
            ? { ...player, name: action.name, avatar: action.avatar }
            : player,
        ),
      };
    case 'config/set':
      return { ...state, config: action.config };
    case 'game/reset': {
      const fresh = createInitialState();
      // A new game keeps the language the player already picked.
      return { ...fresh, config: { ...fresh.config, language: state.config.language } };
    }
    case 'game/start':
      return startGameState(state, action.currentTurn);
    case 'game/spin':
      return { ...state, status: 'spinning', currentCategory: null };
    case 'game/land':
      // Landing starts a new question in the same turn, so it must not re-arm
      // state that is scoped to the turn: only `closeQuestion` ends a turn.
      return {
        ...state,
        status: 'answering',
        currentCategory: action.category,
        ultraChallenge: null,
        awaitingCrown: false,
        retryUsed: false,
      };
    default:
      return state;
  }
}

/** A pure transition that also reports what the caller must do next. */
export type Step<T> = { state: GameState; value: T };

function hasPowerup(state: GameState, id: PowerupId): boolean {
  return state.config.powerups.includes(id) && state.players[state.currentTurn].powerups[id] > 0;
}

function spendPowerup(state: GameState, id: PowerupId): GameState {
  return {
    ...state,
    players: updatePlayer(state.players, state.currentTurn, (player) => ({
      ...player,
      powerups: { ...player.powerups, [id]: Math.max(0, player.powerups[id] - 1) },
    })),
  };
}

/**
 * Spends one 2da Chance to re-present the current question. It happens once per question
 * and never on a timeout, so the answer that follows is final.
 */
function spendSecondChance(state: GameState, allowSecondChance: boolean): GameState | null {
  if (!allowSecondChance) return null;
  if (state.retryUsed || !hasPowerup(state, 'second-chance')) return null;
  return { ...spendPowerup(state, 'second-chance'), retryUsed: true };
}

/**
 * Applies the win condition for the current mode. Called only after score, crown,
 * round and turn writes so the check always sees the settled board.
 */
function settle(state: GameState): Step<AnswerOutcome> {
  if (!isGameOver(state)) return { state, value: 'continue' };
  return { state: { ...state, status: 'ended', winner: stateWinner(state) }, value: 'ended' };
}

/**
 * Closes a question: credits the round (rondas mode), flips the turn exactly once and
 * runs the win check. `pointsEarned` is what this player scored on this question.
 */
function closeQuestion(state: GameState, pointsEarned: number): Step<AnswerOutcome> {
  const answeredBy = state.currentTurn;
  const closed: GameState = {
    ...state,
    currentTurn: nextTurn(answeredBy),
    awaitingCrown: false,
    ultraUsed: false,
    retryUsed: false,
  };

  if (state.config.mode !== 'rondas') return settle(closed);

  const points: [number, number] = [...state.roundPoints];
  points[answeredBy] += pointsEarned;
  const answers: [number, number] = [...state.roundAnswers];
  answers[answeredBy] += 1;

  if (answers[0] === 0 || answers[1] === 0) {
    return settle({ ...closed, roundPoints: points, roundAnswers: answers });
  }

  const winner = roundWinner(points);
  const roundWins: [number, number] = [...state.roundWins];
  if (winner !== null) roundWins[winner] += 1;

  return settle({
    ...closed,
    roundPoints: [0, 0],
    roundAnswers: [0, 0],
    roundWins,
    round: state.round + 1,
  });
}

/**
 * Confirms the selected option. A correct answer scores and may owe a crown choice;
 * a wrong answer spends one 2da Chance to re-present the same question, or closes it.
 */
export function resolveAnswer(
  state: GameState,
  isCorrect: boolean,
  allowSecondChance = true,
): Step<AnswerOutcome> {
  if (state.status === 'ended') return { state, value: 'none' };
  if (state.awaitingCrown) return { state, value: 'crown-pick' };

  if (!isCorrect) {
    const retried = spendSecondChance(state, allowSecondChance);
    if (retried !== null) return { state: retried, value: 'retry' };
    return closeQuestion(state, 0);
  }

  const scored: GameState = {
    ...state,
    players: updatePlayer(state.players, state.currentTurn, (player) => ({
      ...player,
      score: player.score + POINTS_PER_CORRECT_ANSWER,
      crownTally: player.crownTally + 1,
    })),
  };

  if (scored.players[state.currentTurn].crownTally >= TALLY_TO_EARN_CROWN) {
    return { state: { ...scored, awaitingCrown: true }, value: 'crown-pick' };
  }

  return closeQuestion(scored, POINTS_PER_CORRECT_ANSWER);
}

/** Records the crown the player chose for their 3-win tally, then closes the question. */
export function resolveCrownPick(state: GameState, category: CategoryName): Step<AnswerOutcome> {
  if (!state.awaitingCrown) return { state, value: 'none' };

  const player = state.players[state.currentTurn];
  if (player.crowns.includes(category)) return { state, value: 'crown-pick' };

  return closeQuestion(
    {
      ...state,
      awaitingCrown: false,
      players: updatePlayer(state.players, state.currentTurn, (current) => ({
        ...current,
        crowns: withCrown(current.crowns, category),
        crownTally: 0,
      })),
    },
    POINTS_PER_CORRECT_ANSWER,
  );
}

/** Spends one use of a manually fired comodín. 2da Chance is reactive and never fired here. */
export function resolvePowerup(state: GameState, id: PowerupId): Step<boolean> {
  if (state.status === 'ended') return { state, value: false };
  if (id === 'second-chance' || !hasPowerup(state, id)) return { state, value: false };

  const spent = spendPowerup(state, id);
  return {
    state: id === 'skip-question' ? { ...spent, retryUsed: false } : spent,
    value: true,
  };
}

/** Opens an ultra desafío for the given category, once per turn. */
export function resolveUltraStart(state: GameState, category: CategoryName): Step<boolean> {
  if (state.status === 'ended' || state.ultraUsed || state.awaitingCrown) {
    return { state, value: false };
  }
  return {
    state: { ...state, ultraChallenge: category, ultraUsed: true, retryUsed: false },
    value: true,
  };
}

/**
 * Resolves the ultra desafío question. It is an extra question inside the turn: it never
 * scores points, never counts toward the round boundary and never passes the turn.
 */
export function resolveUltraAnswer(
  state: GameState,
  isCorrect: boolean,
  allowSecondChance = true,
): Step<AnswerOutcome> {
  const challenge = state.ultraChallenge;
  if (challenge === null || state.status === 'ended') {
    return { state, value: 'none' };
  }

  if (!isCorrect) {
    const retried = spendSecondChance(state, allowSecondChance);
    if (retried !== null) return { state: retried, value: 'retry' };

    const reset: GameState = {
      ...state,
      ultraChallenge: null,
      retryUsed: false,
      players: updatePlayer(state.players, state.currentTurn, (player) => ({
        ...player,
        crownTally: 0,
      })),
    };
    return settle(reset);
  }

  const won: GameState = {
    ...state,
    ultraChallenge: null,
    retryUsed: false,
    players: updatePlayer(state.players, state.currentTurn, (player) => ({
      ...player,
      crowns: withCrown(player.crowns, challenge),
    })),
  };
  return settle(won);
}

/** Applies the win condition on demand and reports whether the game ended. */
export function resolveGameEnd(state: GameState): Step<boolean> {
  if (state.status === 'ended') return { state, value: false };
  const result = settle(state);
  return { state: result.state, value: result.value === 'ended' };
}

export interface GameContextValue {
  state: GameState;
  setPlayer: (id: 0 | 1, player: { name: string; avatar: AvatarId }) => void;
  setConfig: (config: GameConfig) => void;
  startGame: () => boolean;
  spin: () => void;
  land: (category: CategoryName) => void;
  /** Returns the store to its initial state, ready for a new game. */
  resetGame: () => void;
  answerQuestion: (isCorrect: boolean, options?: { allowSecondChance?: boolean }) => AnswerOutcome;
  usePowerup: (id: PowerupId) => boolean;
  pickCrown: (category: CategoryName) => AnswerOutcome;
  startUltraChallenge: (category: CategoryName) => boolean;
  resolveUltra: (isCorrect: boolean, options?: { allowSecondChance?: boolean }) => AnswerOutcome;
  endGame: () => boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  /** Starting point of the store, so a caller can mount it on a known game state. */
  initialState?: GameState;
}) {
  const [state, setState] = useState<GameState>(() => initialState ?? initialGameState());
  // The store is read synchronously by callers that need the next outcome, so the
  // mirror is advanced next to every write instead of only on the next render.
  const stateRef = useRef(state);

  // Remember the player's language so it survives reloads and new games.
  useEffect(() => {
    storeLanguage(state.config.language);
  }, [state.config.language]);

  const dispatch = useCallback((action: GameAction) => {
    const next = gameReducer(stateRef.current, action);
    stateRef.current = next;
    setState(next);
  }, []);

  const transition = useCallback(<T,>(step: (current: GameState) => Step<T>): T => {
    const result = step(stateRef.current);
    stateRef.current = result.state;
    setState(result.state);
    return result.value;
  }, []);

  const setPlayer = useCallback(
    (id: 0 | 1, player: { name: string; avatar: AvatarId }) => {
      dispatch({ type: 'player/set', id, name: player.name, avatar: player.avatar });
    },
    [dispatch],
  );

  const setConfig = useCallback(
    (config: GameConfig) => {
      dispatch({ type: 'config/set', config });
    },
    [dispatch],
  );

  const startGame = useCallback((): boolean => {
    const currentTurn: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    dispatch({ type: 'game/start', currentTurn });
    return true;
  }, [dispatch]);

  const spin = useCallback(() => {
    dispatch({ type: 'game/spin' });
  }, [dispatch]);

  const land = useCallback(
    (category: CategoryName) => {
      dispatch({ type: 'game/land', category });
    },
    [dispatch],
  );

  const resetGame = useCallback(() => {
    dispatch({ type: 'game/reset' });
  }, [dispatch]);

  const answerQuestion = useCallback(
    (isCorrect: boolean, options?: { allowSecondChance?: boolean }): AnswerOutcome =>
      transition((current) =>
        resolveAnswer(current, isCorrect, options?.allowSecondChance ?? true),
      ),
    [transition],
  );

  const usePowerup = useCallback(
    (id: PowerupId): boolean => transition((current) => resolvePowerup(current, id)),
    [transition],
  );

  const pickCrown = useCallback(
    (category: CategoryName): AnswerOutcome =>
      transition((current) => resolveCrownPick(current, category)),
    [transition],
  );

  const startUltraChallenge = useCallback(
    (category: CategoryName): boolean =>
      transition((current) => resolveUltraStart(current, category)),
    [transition],
  );

  const resolveUltra = useCallback(
    (isCorrect: boolean, options?: { allowSecondChance?: boolean }): AnswerOutcome =>
      transition((current) =>
        resolveUltraAnswer(current, isCorrect, options?.allowSecondChance ?? true),
      ),
    [transition],
  );

  const endGame = useCallback((): boolean => transition(resolveGameEnd), [transition]);

  const value = useMemo(
    () => ({
      state,
      setPlayer,
      setConfig,
      startGame,
      spin,
      land,
      resetGame,
      answerQuestion,
      usePowerup,
      pickCrown,
      startUltraChallenge,
      resolveUltra,
      endGame,
    }),
    [
      state,
      setPlayer,
      setConfig,
      startGame,
      spin,
      land,
      resetGame,
      answerQuestion,
      usePowerup,
      pickCrown,
      startUltraChallenge,
      resolveUltra,
      endGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (context === null) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
