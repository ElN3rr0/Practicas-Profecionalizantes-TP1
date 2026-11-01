import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createInitialState, gameReducer } from '../game/GameProvider';
import { ProfilesProvider, useProfiles } from './ProfilesProvider';
import type { ReactNode } from 'react';
import { createEmptyProfile, loadProfiles, PROFILES_STORAGE_KEY, saveProfiles } from './storage';

function wrapper({ children }: { children: ReactNode }) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}

function setup() {
  return renderHook(() => useProfiles(), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
});

describe('ProfilesProvider', () => {
  it('creates, updates and deletes profiles, persisting them', () => {
    const { result } = setup();

    let id = '';
    act(() => {
      id = result.current.createProfile('Ana', 'smart_toy').id;
    });
    expect(result.current.profiles).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? '[]')).toHaveLength(1);

    act(() => result.current.updateProfile(id, { name: 'Ana María' }));
    expect(result.current.getProfile(id)?.name).toBe('Ana María');

    act(() => result.current.deleteProfile(id));
    expect(result.current.profiles).toHaveLength(0);
  });

  it('keeps profiles across a remount (page reload)', () => {
    const first = setup();
    let id = '';
    act(() => {
      id = first.result.current.createProfile('Ana').id;
    });
    first.unmount();

    const second = setup();
    expect(second.result.current.getProfile(id)?.name).toBe('Ana');
  });

  it('pays rewards once per game id and records stats', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.createProfile('Ana').id;
    });

    let firstOutcomes: ReturnType<typeof result.current.deliverGameRewards> = [];
    act(() => {
      firstOutcomes = result.current.deliverGameRewards({
        gameId: 'game-1',
        completed: true,
        players: [
          { profileId: id, correctAnswers: 3, incorrectAnswers: 1, bestStreak: 2, isWinner: true },
        ],
      });
    });
    expect(firstOutcomes).toHaveLength(1);
    expect(firstOutcomes[0].newAchievements).toContain('first_win');

    // Same game id again must not pay twice (reload / new render / StrictMode).
    let secondOutcomes: ReturnType<typeof result.current.deliverGameRewards> = [];
    act(() => {
      secondOutcomes = result.current.deliverGameRewards({
        gameId: 'game-1',
        completed: true,
        players: [
          { profileId: id, correctAnswers: 3, incorrectAnswers: 1, bestStreak: 2, isWinner: true },
        ],
      });
    });
    expect(secondOutcomes).toEqual(firstOutcomes);

    const profile = result.current.getProfile(id);
    expect(profile?.totalXp).toBe(3 * 10 + 20 + 30);
    expect(profile?.totalCoins).toBe(3 * 3 + 10 + 15);
    expect(profile?.stats).toMatchObject({
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      correctAnswers: 3,
      incorrectAnswers: 1,
      bestStreak: 2,
    });
  });

  it('pays the loser its participation rewards and counts a loss', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.createProfile('Luis').id;
    });

    act(() => {
      result.current.deliverGameRewards({
        gameId: 'game-2',
        completed: true,
        players: [
          { profileId: id, correctAnswers: 2, incorrectAnswers: 3, bestStreak: 1, isWinner: false },
        ],
      });
    });

    const profile = result.current.getProfile(id);
    expect(profile?.totalXp).toBe(2 * 10 + 20);
    expect(profile?.totalCoins).toBe(2 * 3 + 10);
    expect(profile?.stats.losses).toBe(1);
    expect(profile?.stats.wins).toBe(0);
  });

  it('does not pay guests and does not pay abandoned games', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.createProfile('Ana').id;
    });

    act(() => {
      const guestOutcomes = result.current.deliverGameRewards({
        gameId: 'game-3',
        completed: true,
        players: [
          {
            profileId: null,
            correctAnswers: 5,
            incorrectAnswers: 0,
            bestStreak: 5,
            isWinner: true,
          },
        ],
      });
      expect(guestOutcomes).toEqual([]);
    });

    act(() => {
      const abandoned = result.current.deliverGameRewards({
        gameId: 'game-4',
        completed: false,
        players: [
          { profileId: id, correctAnswers: 5, incorrectAnswers: 0, bestStreak: 5, isWinner: true },
        ],
      });
      expect(abandoned).toEqual([]);
    });

    expect(result.current.getProfile(id)?.totalXp).toBe(0);
  });

  it('exports and imports profiles', () => {
    const { result } = setup();
    act(() => {
      result.current.createProfile('Ana');
    });
    const json = result.current.exportProfiles();
    act(() => {
      result.current.deleteProfile(result.current.profiles[0].id);
    });
    act(() => {
      result.current.importProfiles(json);
    });
    expect(result.current.profiles).toHaveLength(1);
  });

  it('resetting a game does not delete profiles', () => {
    const profile = createEmptyProfile('Ana');
    saveProfiles([profile]);

    const reset = gameReducer(createInitialState(), { type: 'game/reset' });

    expect(reset.status).toBe('setup');
    expect(loadProfiles()).toHaveLength(1);
    expect(loadProfiles()[0].id).toBe(profile.id);
  });

  it('buys coin items, equips cosmetics and respects level locks', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.createProfile('Ana').id;
    });

    // 10 correct + win => 150 XP (level 2) and 55 coins.
    act(() => {
      result.current.deliverGameRewards({
        gameId: 'shop-game',
        completed: true,
        players: [
          {
            profileId: id,
            correctAnswers: 10,
            incorrectAnswers: 0,
            bestStreak: 10,
            isWinner: true,
          },
        ],
      });
    });

    let buy: { ok: boolean; reason?: string } = { ok: false };
    act(() => {
      buy = result.current.buyItem(id, 'frame_plum');
    });
    expect(buy.ok).toBe(true);
    expect(result.current.getProfile(id)?.totalCoins).toBe(15);
    expect(result.current.getProfile(id)?.inventory).toContain('frame_plum');

    let equipped = false;
    act(() => {
      equipped = result.current.equipItem(id, 'frame', 'frame_plum');
    });
    expect(equipped).toBe(true);
    expect(result.current.getProfile(id)?.equipped.frame).toBe('frame_plum');

    // Level 2 unlocks frame_neon for free.
    act(() => {
      result.current.equipItem(id, 'frame', 'frame_neon');
    });
    expect(result.current.getProfile(id)?.equipped.frame).toBe('frame_neon');

    // frame_gold needs level 5.
    expect(result.current.equipItem(id, 'frame', 'frame_gold')).toBe(false);
  });

  it('refuses a purchase when the profile lacks coins', () => {
    const { result } = setup();
    let id = '';
    act(() => {
      id = result.current.createProfile('Ana').id;
    });
    let buy: { ok: boolean; reason?: string } = { ok: true };
    act(() => {
      buy = result.current.buyItem(id, 'frame_plum');
    });
    expect(buy.ok).toBe(false);
    expect(result.current.getProfile(id)?.totalCoins).toBe(0);
  });
});
