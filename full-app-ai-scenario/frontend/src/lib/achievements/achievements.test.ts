import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, unlockedAchievements } from './achievements';
import { createEmptyProfile } from '../profiles/storage';
import type { Profile } from '../profiles/types';

function profile(overrides: Partial<Profile> = {}): Profile {
  return { ...createEmptyProfile('Ana'), ...overrides };
}

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

describe('achievements', () => {
  it('starts with no badges', () => {
    expect(unlockedAchievements(profile())).toEqual([]);
  });

  it('unlocks the first win, streak and accuracy badges from stats', () => {
    const unlocked = ids(
      unlockedAchievements(
        profile({
          stats: {
            gamesPlayed: 3,
            wins: 1,
            losses: 2,
            correctAnswers: 18,
            incorrectAnswers: 2,
            bestStreak: 5,
          },
        }),
      ),
    );

    expect(unlocked).toEqual(
      expect.arrayContaining(['first_win', 'streak_5', 'perfect_10', 'sniper']),
    );
    expect(unlocked).not.toContain('ten_games');
    expect(unlocked).not.toContain('streak_10');
  });

  it('unlocks level and coin milestones', () => {
    const unlocked = ids(unlockedAchievements(profile({ totalXp: 700, totalCoinsEarned: 500 })));

    expect(unlocked).toEqual(expect.arrayContaining(['level_5', 'rich', 'magnate']));
    expect(unlocked).not.toContain('level_10');
  });

  it('uses stable unique ids', () => {
    const achievementIds = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(achievementIds).size).toBe(achievementIds.length);
  });
});
