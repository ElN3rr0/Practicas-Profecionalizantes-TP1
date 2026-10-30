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

export function holdsEveryCrown(player: Player): boolean {
  return WHEEL_CATEGORIES.every((category) => player.crowns.includes(category));
}

/** The player holding all six crowns, or `null` when nobody does. */
export function crownWinner(players: readonly [Player, Player]): 0 | 1 | null {
  const holder = players.findIndex(holdsEveryCrown);
  return holder === 0 || holder === 1 ? holder : null;
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
  return state.round > ROUNDS_PER_GAME && roundWinner(state.roundWins) !== null;
}

/**
 * The winner of a finished state, applying each mode's rule. The tied branch of
 * `roundWinner` is unreachable through `isGameOver`, so a finished "10 rondas" game
 * always names a player.
 */
export function stateWinner(state: GameState): 0 | 1 | null {
  if (state.config.mode === 'coronas') return crownWinner(state.players);
  return roundWinner(state.roundWins);
}
