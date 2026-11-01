import { describe, expect, it } from 'vitest';
import { calculateGameReward } from './rewards';

describe('calculateGameReward', () => {
  it('pays correct answers and completion to the loser', () => {
    expect(calculateGameReward({ correctAnswers: 4, isWinner: false, completed: true })).toEqual({
      xp: 4 * 10 + 20,
      coins: 4 * 3 + 10,
    });
  });

  it('adds the winner bonus on top', () => {
    expect(calculateGameReward({ correctAnswers: 4, isWinner: true, completed: true })).toEqual({
      xp: 4 * 10 + 20 + 30,
      coins: 4 * 3 + 10 + 15,
    });
  });

  it('pays the completion bonus even with zero correct answers', () => {
    expect(calculateGameReward({ correctAnswers: 0, isWinner: false, completed: true })).toEqual({
      xp: 20,
      coins: 10,
    });
  });

  it('pays nothing when the game was abandoned', () => {
    expect(calculateGameReward({ correctAnswers: 5, isWinner: true, completed: false })).toEqual({
      xp: 0,
      coins: 0,
    });
  });
});
