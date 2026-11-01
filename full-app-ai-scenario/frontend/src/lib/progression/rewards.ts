import {
  COINS_PER_CORRECT_ANSWER,
  COINS_PER_GAME_COMPLETE,
  COINS_PER_GAME_WIN,
  XP_PER_CORRECT_ANSWER,
  XP_PER_GAME_COMPLETE,
  XP_PER_GAME_WIN,
} from './constants';

export type GameRewardSource = {
  correctAnswers: number;
  isWinner: boolean;
  /** A game that did not finish (abandoned) never pays completion rewards. */
  completed: boolean;
};

export type GameReward = {
  xp: number;
  coins: number;
};

/** Centralized reward calculation for one player in one game. */
export function calculateGameReward({
  correctAnswers,
  isWinner,
  completed,
}: GameRewardSource): GameReward {
  if (!completed) return { xp: 0, coins: 0 };

  const answers = Number.isFinite(correctAnswers) ? Math.max(0, correctAnswers) : 0;

  return {
    xp: answers * XP_PER_CORRECT_ANSWER + XP_PER_GAME_COMPLETE + (isWinner ? XP_PER_GAME_WIN : 0),
    coins:
      answers * COINS_PER_CORRECT_ANSWER +
      COINS_PER_GAME_COMPLETE +
      (isWinner ? COINS_PER_GAME_WIN : 0),
  };
}
