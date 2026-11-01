import { crownWinner, duelWinner, roundWinner, timeWinner } from './rules';
import { WHEEL_CATEGORIES } from './spin';
import type { GameMode, GameState, Player } from './types';

/** Display name of each game mode, shared by the results banner and the player cards. */
export const MODE_LABELS: Record<GameMode, string> = {
  coronas: '6 Coronas',
  rondas: '10 Rondas',
  duelo: 'Duelo Definitivo',
  contrarreloj: 'Contrarreloj',
};

/**
 * The winner of a finished game. "6 Coronas" is decided by the player holding every
 * crown, "10 Rondas" by the round-wins. Sudden death keeps a tied round count from
 * ending the game, so the round-wins always differ here; the `?? 0` fallback only
 * covers a state the end-game trigger cannot produce. A game that has not ended has
 * no winner.
 */
export function resolveWinner(state: GameState): 0 | 1 | null {
  if (state.status !== 'ended') return null;
  if (state.config.mode === 'coronas') return crownWinner(state.players);
  if (state.config.mode === 'duelo') return duelWinner(state.players);
  if (state.config.mode === 'contrarreloj') return timeWinner(state.players);

  return roundWinner(state.roundWins) ?? 0;
}

/**
 * The achievement the mode measures for one player: crowns held or rounds won. Rounds
 * won carry no fixed denominator because a tied game plays past the tenth round.
 */
export function modeAchievement(player: Player, mode: GameMode, roundsWon: number): string {
  if (mode === 'coronas') return `${player.crowns.length} de ${WHEEL_CATEGORIES.length} coronas`;
  if (mode === 'duelo') return 'Primer acierto';
  if (mode === 'contrarreloj') return `${player.score} puntos`;
  return `${roundsWon} rondas ganadas`;
}
