import { LEVEL_1_XP, LEVEL_XP_STEP } from './constants';

/** A safety cap so corrupt huge XP values cannot loop forever. */
const MAX_LEVEL = 9999;

/** XP required to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return LEVEL_1_XP;
  return LEVEL_1_XP + (level - 1) * LEVEL_XP_STEP;
}

/** Total XP required to reach a given level (level 1 starts at 0). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpForLevel(current);
  }
  return total;
}

export type LevelProgress = {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP needed to finish the current level. */
  xpForNext: number;
  /** 0..1 progress inside the current level. */
  ratio: number;
  /** XP still missing to reach the next level. */
  xpToNext: number;
};

/** Derives level and progress from the total accumulated XP. */
export function levelProgress(totalXp: number): LevelProgress {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;

  let level = 1;
  let remaining = safeXp;
  while (level < MAX_LEVEL && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }

  const xpForNext = xpForLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForNext,
    ratio: xpForNext === 0 ? 0 : remaining / xpForNext,
    xpToNext: Math.max(0, xpForNext - remaining),
  };
}
