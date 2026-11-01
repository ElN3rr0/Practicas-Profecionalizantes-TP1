import type { AvatarId } from '../game/types';
import type { CosmeticSlot, Profile, ProfileStats } from './types';

export const PROFILES_STORAGE_KEY = 'a-ver-si-sabes:profiles';
export const DELIVERED_GAMES_KEY = 'a-ver-si-sabes:delivered-games';
export const PROFILES_SCHEMA_VERSION = 1;

const DEFAULT_AVATAR: AvatarId = 'account_circle';

/** Id generation with a fallback for environments without `crypto.randomUUID`. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyStats(): ProfileStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    bestStreak: 0,
  };
}

export function createEmptyProfile(name: string, avatar: AvatarId = DEFAULT_AVATAR): Profile {
  const now = new Date().toISOString();
  return {
    id: newId(),
    schemaVersion: PROFILES_SCHEMA_VERSION,
    name: name.trim() || 'Jugador',
    avatar,
    createdAt: now,
    updatedAt: now,
    totalXp: 0,
    totalCoins: 0,
    totalCoinsEarned: 0,
    stats: emptyStats(),
    inventory: [],
    equipped: {},
  };
}

function toCount(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

/** Validates and normalizes a stored profile, or returns null when it is unusable. */
export function validateProfile(raw: unknown): Profile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;

  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (typeof record.name !== 'string') return null;
  if (typeof record.avatar !== 'string') return null;

  const stats = (record.stats ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();

  return {
    id: record.id,
    schemaVersion: PROFILES_SCHEMA_VERSION,
    name: record.name,
    avatar: record.avatar,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    totalXp: toCount(record.totalXp),
    totalCoins: toCount(record.totalCoins),
    totalCoinsEarned: toCount(record.totalCoinsEarned, toCount(record.totalCoins)),
    stats: {
      gamesPlayed: toCount(stats.gamesPlayed),
      wins: toCount(stats.wins),
      losses: toCount(stats.losses),
      correctAnswers: toCount(stats.correctAnswers),
      incorrectAnswers: toCount(stats.incorrectAnswers),
      bestStreak: toCount(stats.bestStreak),
    },
    inventory: Array.isArray(record.inventory)
      ? record.inventory.filter((value): value is string => typeof value === 'string')
      : [],
    equipped: normalizeEquipped(record.equipped),
  };
}

function normalizeEquipped(raw: unknown): Partial<Record<CosmeticSlot, string>> {
  const equipped: Partial<Record<CosmeticSlot, string>> = {};
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (typeof record.frame === 'string') equipped.frame = record.frame;
    if (typeof record.title === 'string') equipped.title = record.title;
  }
  return equipped;
}

/** Loads profiles defensively: corrupt or incompatible data yields the usable subset. */
export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const profiles: Profile[] = [];
    for (const item of parsed) {
      const profile = validateProfile(item);
      if (profile && !seen.has(profile.id)) {
        seen.add(profile.id);
        profiles.push(profile);
      }
    }
    return profiles;
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Storage unavailable (private mode); the in-memory session still works.
  }
}

export function serializeProfiles(profiles: Profile[]): string {
  return JSON.stringify({ schemaVersion: PROFILES_SCHEMA_VERSION, profiles }, null, 2);
}

export type ImportResult = {
  profiles: Profile[];
  imported: number;
  skipped: number;
};

/** Merges a JSON export into the current profiles, skipping invalid or duplicate ids. */
export function mergeImportedProfiles(current: Profile[], json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { profiles: current, imported: 0, skipped: 0 };
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { profiles?: unknown }).profiles)
  ) {
    rawList = (parsed as { profiles: unknown[] }).profiles;
  }

  const byId = new Map(current.map((profile) => [profile.id, profile]));
  let imported = 0;
  let skipped = 0;

  for (const item of rawList) {
    const profile = validateProfile(item);
    if (!profile || byId.has(profile.id)) {
      skipped += 1;
      continue;
    }
    byId.set(profile.id, profile);
    imported += 1;
  }

  return { profiles: [...byId.values()], imported, skipped };
}

export function loadDeliveredGames(): string[] {
  try {
    const raw = localStorage.getItem(DELIVERED_GAMES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function saveDeliveredGames(ids: Iterable<string>): void {
  try {
    const list = Array.from(ids).slice(-200);
    localStorage.setItem(DELIVERED_GAMES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
