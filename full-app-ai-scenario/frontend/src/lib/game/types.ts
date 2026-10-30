export type AvatarId = string;

export type CategoryName =
  'ciencia' | 'arte' | 'historia' | 'entretenimiento' | 'deportes' | 'geografia';

export type PowerupId = 'fifty-fifty' | 'second-chance' | 'plus-time' | 'skip-question' | 'hint';

export type PowerupInventory = Record<PowerupId, number>;

export type Player = {
  id: 0 | 1;
  name: string;
  avatar: AvatarId;
  score: number;
  crowns: CategoryName[];
  crownTally: number;
  powerups: PowerupInventory;
};

export type GameMode = 'coronas' | 'rondas';

export type GameConfig = {
  mode: GameMode;
  timePerTurn: 15 | 20 | 30;
  powerups: PowerupId[];
};

export type GameStatus = 'setup' | 'spinning' | 'answering' | 'ended';

/**
 * What the caller of a resolution action must do next:
 * - `continue`: the question is closed and the turn passed — return to the wheel.
 * - `crown-pick`: the player owes a crown choice before the turn can pass.
 * - `retry`: the same question is re-presented because a 2da Chance was spent.
 * - `ended`: the win condition was met — go to the results screen.
 * - `none`: the action was a guarded no-op.
 */
export type AnswerOutcome = 'continue' | 'crown-pick' | 'retry' | 'ended' | 'none';

export type GameState = {
  players: [Player, Player];
  config: GameConfig;
  currentTurn: 0 | 1;
  round: number;
  roundWins: [number, number];
  winner: 0 | 1 | null;
  ultraChallenge: CategoryName | null;
  status: GameStatus;
  currentCategory: CategoryName | null;
  /** Points each player earned in the round in progress (rondas mode only). */
  roundPoints: [number, number];
  /** Questions each player has closed in the round in progress (rondas mode only). */
  roundAnswers: [number, number];
  /** True while the current player must choose the crown their 3-win tally earned. */
  awaitingCrown: boolean;
  /** True once the current question has already spent its 2da Chance retry. */
  retryUsed: boolean;
  /** True once the current player started an ultra desafío during this turn. */
  ultraUsed: boolean;
};
