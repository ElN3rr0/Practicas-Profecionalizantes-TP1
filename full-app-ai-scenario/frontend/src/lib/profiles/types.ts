import type { AvatarId } from '../game/types';

/** Opaque identifier; never derived from the name. */
export type ProfileId = string;

export type CosmeticSlot = 'frame' | 'title';

export type ProfileStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  correctAnswers: number;
  incorrectAnswers: number;
  bestStreak: number;
};

export type Profile = {
  id: ProfileId;
  schemaVersion: number;
  name: string;
  avatar: AvatarId;
  createdAt: string;
  updatedAt: string;
  /** Accumulated XP (never spent). Level is derived from this. */
  totalXp: number;
  /** Current coin balance. */
  totalCoins: number;
  /** Lifetime coins earned, kept separate so the shop can spend `totalCoins`. */
  totalCoinsEarned: number;
  stats: ProfileStats;
  /** Purchased item ids (shop). */
  inventory: string[];
  /** Equipped cosmetics, one per slot. */
  equipped: Partial<Record<CosmeticSlot, string>>;
};
