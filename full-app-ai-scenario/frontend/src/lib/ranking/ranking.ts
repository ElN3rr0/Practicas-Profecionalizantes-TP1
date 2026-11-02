import type { Profile } from '../profiles/types';

/**
 * Global ranking order: experience first, then competitive results, then wealth,
 * and finally the name so equal profiles keep a stable order. Pure so the header
 * panel and its tests share exactly one definition.
 */
export function rankProfiles(profiles: readonly Profile[]): Profile[] {
  return [...profiles].sort(
    (a, b) =>
      b.totalXp - a.totalXp ||
      b.stats.wins - a.stats.wins ||
      b.totalCoins - a.totalCoins ||
      a.name.localeCompare(b.name),
  );
}
