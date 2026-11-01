import type { ProfileStats } from '../profiles/types';

/** Accuracy (0..1) derived from the stored correct/incorrect counters. */
export function accuracy(stats: ProfileStats): number {
  const total = stats.correctAnswers + stats.incorrectAnswers;
  if (total <= 0) return 0;
  return stats.correctAnswers / total;
}

export function accuracyPercent(stats: ProfileStats): number {
  return Math.round(accuracy(stats) * 100);
}
