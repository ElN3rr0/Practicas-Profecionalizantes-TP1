import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AvatarId } from '../game/types';
import { unlockedAchievements } from '../achievements/achievements';
import { getItem } from '../catalog/items';
import { levelProgress } from '../progression/levels';
import { calculateGameReward } from '../progression/rewards';
import type { CosmeticSlot, Profile } from './types';
import {
  createEmptyProfile,
  loadDeliveredGames,
  loadProfiles,
  mergeImportedProfiles,
  saveDeliveredGames,
  saveProfiles,
  serializeProfiles,
} from './storage';

export type GamePlayerResult = {
  profileId: string | null;
  correctAnswers: number;
  incorrectAnswers: number;
  bestStreak: number;
  isWinner: boolean;
};

export type GameResultInput = {
  /** Unique per game; the idempotency key for reward delivery. */
  gameId: string;
  /** Only a finished game pays completion rewards. */
  completed: boolean;
  players: GamePlayerResult[];
};

export type RewardOutcome = {
  profileId: string;
  xp: number;
  coins: number;
  levelBefore: number;
  levelAfter: number;
  /** Achievement ids first unlocked by this game. */
  newAchievements: string[];
};

export type ImportSummary = { imported: number; skipped: number };

interface ProfilesContextValue {
  profiles: Profile[];
  getProfile: (id: string) => Profile | undefined;
  createProfile: (name: string, avatar?: AvatarId) => Profile;
  updateProfile: (id: string, patch: { name?: string; avatar?: AvatarId }) => void;
  deleteProfile: (id: string) => void;
  exportProfiles: () => string;
  importProfiles: (json: string) => ImportSummary;
  /** Applies end-of-game rewards exactly once per game id. */
  deliverGameRewards: (input: GameResultInput) => RewardOutcome[];
  /** Buys a coin-priced item if affordable; returns why it failed otherwise. */
  buyItem: (profileId: string, itemId: string) => { ok: boolean; reason?: string };
  /** Equips an unlocked cosmetic in its slot. */
  equipItem: (profileId: string, slot: CosmeticSlot, itemId: string) => boolean;
  unequip: (profileId: string, slot: CosmeticSlot) => void;
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const profilesRef = useRef(profiles);
  const deliveredRef = useRef<Set<string> | null>(null);
  if (deliveredRef.current === null) {
    deliveredRef.current = new Set(loadDeliveredGames());
  }
  // Cache the outcomes per game so a StrictMode remount still shows what was paid.
  const outcomesByGame = useRef<Map<string, RewardOutcome[]>>(new Map());

  const commit = useCallback((next: Profile[]) => {
    profilesRef.current = next;
    setProfiles(next);
    saveProfiles(next);
  }, []);

  const getProfile = useCallback(
    (id: string) => profilesRef.current.find((profile) => profile.id === id),
    [],
  );

  const createProfile = useCallback(
    (name: string, avatar?: AvatarId) => {
      const profile = createEmptyProfile(name, avatar);
      commit([...profilesRef.current, profile]);
      return profile;
    },
    [commit],
  );

  const updateProfile = useCallback(
    (id: string, patch: { name?: string; avatar?: AvatarId }) => {
      const updatedAt = new Date().toISOString();
      commit(
        profilesRef.current.map((profile) =>
          profile.id === id ? { ...profile, ...patch, updatedAt } : profile,
        ),
      );
    },
    [commit],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      commit(profilesRef.current.filter((profile) => profile.id !== id));
    },
    [commit],
  );

  const exportProfiles = useCallback(() => serializeProfiles(profilesRef.current), []);

  const importProfiles = useCallback(
    (json: string): ImportSummary => {
      const result = mergeImportedProfiles(profilesRef.current, json);
      if (result.imported > 0) commit(result.profiles);
      return { imported: result.imported, skipped: result.skipped };
    },
    [commit],
  );

  const deliverGameRewards = useCallback(
    (input: GameResultInput): RewardOutcome[] => {
      if (!input.completed) return [];

      const delivered = deliveredRef.current as Set<string>;
      const cached = outcomesByGame.current.get(input.gameId);
      if (cached) return cached;
      if (delivered.has(input.gameId)) return [];

      const byId = new Map(profilesRef.current.map((profile) => [profile.id, profile]));
      const outcomes: RewardOutcome[] = [];

      for (const player of input.players) {
        if (!player.profileId) continue;
        const profile = byId.get(player.profileId);
        if (!profile) continue;

        const reward = calculateGameReward({
          correctAnswers: player.correctAnswers,
          isWinner: player.isWinner,
          completed: true,
        });
        const levelBefore = levelProgress(profile.totalXp).level;
        const unlockedBefore = new Set(
          unlockedAchievements(profile).map((achievement) => achievement.id),
        );
        const updated: Profile = {
          ...profile,
          totalXp: profile.totalXp + reward.xp,
          totalCoins: profile.totalCoins + reward.coins,
          totalCoinsEarned: profile.totalCoinsEarned + reward.coins,
          updatedAt: new Date().toISOString(),
          stats: {
            gamesPlayed: profile.stats.gamesPlayed + 1,
            wins: profile.stats.wins + (player.isWinner ? 1 : 0),
            losses: profile.stats.losses + (player.isWinner ? 0 : 1),
            correctAnswers: profile.stats.correctAnswers + Math.max(0, player.correctAnswers),
            incorrectAnswers: profile.stats.incorrectAnswers + Math.max(0, player.incorrectAnswers),
            bestStreak: Math.max(profile.stats.bestStreak, player.bestStreak),
          },
        };
        const levelAfter = levelProgress(updated.totalXp).level;
        const newAchievements = unlockedAchievements(updated)
          .filter((achievement) => !unlockedBefore.has(achievement.id))
          .map((achievement) => achievement.id);
        byId.set(updated.id, updated);
        outcomes.push({
          profileId: updated.id,
          xp: reward.xp,
          coins: reward.coins,
          levelBefore,
          levelAfter,
          newAchievements,
        });
      }

      // Mark after applying: effects run sequentially, so a retry can still pay if this throws.
      delivered.add(input.gameId);
      saveDeliveredGames(delivered);
      outcomesByGame.current.set(input.gameId, outcomes);
      if (outcomes.length > 0) commit([...byId.values()]);
      return outcomes;
    },
    [commit],
  );

  const buyItem = useCallback(
    (profileId: string, itemId: string): { ok: boolean; reason?: string } => {
      const item = getItem(itemId);
      if (!item) return { ok: false, reason: 'Item inexistente.' };
      const profile = profilesRef.current.find((candidate) => candidate.id === profileId);
      if (!profile) return { ok: false, reason: 'Perfil inexistente.' };
      if (item.unlock.type !== 'coins') return { ok: false, reason: 'Se desbloquea por nivel.' };
      const price = item.unlock.price;
      if (profile.inventory.includes(itemId)) return { ok: false, reason: 'Ya lo tenés.' };
      if (profile.totalCoins < price) {
        return { ok: false, reason: 'Monedas insuficientes.' };
      }
      const updatedAt = new Date().toISOString();
      commit(
        profilesRef.current.map((candidate) =>
          candidate.id === profileId
            ? {
                ...candidate,
                totalCoins: candidate.totalCoins - price,
                inventory: [...candidate.inventory, itemId],
                updatedAt,
              }
            : candidate,
        ),
      );
      return { ok: true };
    },
    [commit],
  );

  const equipItem = useCallback(
    (profileId: string, slot: CosmeticSlot, itemId: string): boolean => {
      const item = getItem(itemId);
      if (!item || item.kind !== slot) return false;
      const profile = profilesRef.current.find((candidate) => candidate.id === profileId);
      if (!profile) return false;
      const unlocked =
        item.unlock.type === 'level'
          ? levelProgress(profile.totalXp).level >= item.unlock.level
          : profile.inventory.includes(itemId);
      if (!unlocked) return false;
      const updatedAt = new Date().toISOString();
      commit(
        profilesRef.current.map((candidate) =>
          candidate.id === profileId
            ? {
                ...candidate,
                equipped: { ...candidate.equipped, [slot]: itemId },
                updatedAt,
              }
            : candidate,
        ),
      );
      return true;
    },
    [commit],
  );

  const unequip = useCallback(
    (profileId: string, slot: CosmeticSlot) => {
      const updatedAt = new Date().toISOString();
      commit(
        profilesRef.current.map((candidate) => {
          if (candidate.id !== profileId) return candidate;
          const equipped = { ...candidate.equipped };
          delete equipped[slot];
          return { ...candidate, equipped, updatedAt };
        }),
      );
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      profiles,
      getProfile,
      createProfile,
      updateProfile,
      deleteProfile,
      exportProfiles,
      importProfiles,
      deliverGameRewards,
      buyItem,
      equipItem,
      unequip,
    }),
    [
      profiles,
      getProfile,
      createProfile,
      updateProfile,
      deleteProfile,
      exportProfiles,
      importProfiles,
      deliverGameRewards,
      buyItem,
      equipItem,
      unequip,
    ],
  );

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles(): ProfilesContextValue {
  const context = useContext(ProfilesContext);
  if (context === null) {
    throw new Error('useProfiles must be used within a ProfilesProvider');
  }
  return context;
}
