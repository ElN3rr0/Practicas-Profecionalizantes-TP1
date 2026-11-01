import { WHEEL_CATEGORIES } from './spin';
import type { CategoryName, GameState, Player } from './types';

/** Points a correct answer awards the answering player. */
export const POINTS_PER_CORRECT_ANSWER = 100;

/** Correct answers of any category needed to earn one crown. */
export const TALLY_TO_EARN_CROWN = 3;

/** Rounds that close a game in "10 rondas" mode. */
export const ROUNDS_PER_GAME = 10;

/** Seconds the "+15s" comodín adds to the running countdown. */
export const EXTRA_SECONDS = 15;

/** Total seconds a contrarreloj game lasts. */
export const CONTRARRELOJ_SECONDS = 90;

/** Correct answers needed to win a duel definitivo. */
export const DUEL_CORRECT_ANSWERS = 1;

/** Game wins needed to take a best-of-three tournament. */
export const SERIES_TARGET_WINS = 2;

export function holdsEveryCrown(player: Player): boolean {
  return WHEEL_CATEGORIES.every((category) => player.crowns.includes(category));
}

/** The player holding all six crowns, or `null` when nobody does. */
export function crownWinner(players: readonly [Player, Player]): 0 | 1 | null {
  const holder = players.findIndex(holdsEveryCrown);
  return holder === 0 || holder === 1 ? holder : null;
}

/** The player who landed the first correct answer in a duel, or `null`. */
export function duelWinner(players: readonly [Player, Player]): 0 | 1 | null {
  const index = players.findIndex((player) => player.correctAnswers >= DUEL_CORRECT_ANSWERS);
  return index === 0 || index === 1 ? index : null;
}

/** The higher score when a contrarreloj clock runs out; a tie names nobody. */
export function timeWinner(players: readonly [Player, Player]): 0 | 1 | null {
  if (players[0].score === players[1].score) return null;
  return players[0].score > players[1].score ? 0 : 1;
}

/** The player who already holds a majority of the best-of-three series. */
export function seriesChampion(wins: readonly [number, number]): 0 | 1 | null {
  if (wins[0] >= SERIES_TARGET_WINS) return 0;
  if (wins[1] >= SERIES_TARGET_WINS) return 1;
  return null;
}

/** The player with more points in a round; a tied round credits nobody. */
export function roundWinner(points: readonly [number, number]): 0 | 1 | null {
  if (points[0] === points[1]) return null;
  return points[0] > points[1] ? 0 : 1;
}

export function withCrown(crowns: readonly CategoryName[], category: CategoryName): CategoryName[] {
  return crowns.includes(category) ? [...crowns] : [...crowns, category];
}

/**
 * Whether the current mode's win condition is met. "10 rondas" ends only once the
 * round-wins differ: a tied game keeps playing extra rounds until one player wins a
 * round, so a finished game always has a decided round count.
 */
export function isGameOver(state: GameState): boolean {
  if (state.config.mode === 'coronas') return crownWinner(state.players) !== null;
  if (state.config.mode === 'duelo') return duelWinner(state.players) !== null;
  if (state.config.mode === 'contrarreloj') return state.clock <= 0;
  return state.round > ROUNDS_PER_GAME && roundWinner(state.roundWins) !== null;
}

/**
 * The winner of a finished state, applying each mode's rule. The tied branch of
 * `roundWinner` is unreachable through `isGameOver`, so a finished "10 rondas" game
 * always names a player.
 */
export function stateWinner(state: GameState): 0 | 1 | null {
  if (state.config.mode === 'coronas') return crownWinner(state.players);
  if (state.config.mode === 'duelo') return duelWinner(state.players);
  if (state.config.mode === 'contrarreloj') return timeWinner(state.players);
  return roundWinner(state.roundWins);
}
