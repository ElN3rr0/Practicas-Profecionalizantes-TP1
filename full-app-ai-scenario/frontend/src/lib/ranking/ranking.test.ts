import { describe, expect, it } from 'vitest';
import { createEmptyProfile } from '../profiles/storage';
import type { Profile } from '../profiles/types';
import { rankProfiles } from './ranking';

function profile(name: string, overrides: Partial<Profile> = {}): Profile {
  return { ...createEmptyProfile(name), ...overrides };
}

describe('rankProfiles', () => {
  it('sorts by experience first', () => {
    const ranked = rankProfiles([
      profile('Baja', { totalXp: 10 }),
      profile('Alta', { totalXp: 900 }),
    ]);

    expect(ranked.map((item) => item.name)).toEqual(['Alta', 'Baja']);
  });

  it('breaks experience ties with wins, then coins, then name', () => {
    const ranked = rankProfiles([
      profile('Menos Victorias', { totalXp: 100, stats: { ...profile('x').stats, wins: 1 } }),
      profile('Más Victorias', { totalXp: 100, stats: { ...profile('x').stats, wins: 5 } }),
      profile('Más Monedas', {
        totalXp: 100,
        totalCoins: 80,
        stats: { ...profile('x').stats, wins: 5 },
      }),
      profile('Alfabético', { totalXp: 100 }),
    ]);

    expect(ranked.map((item) => item.name)).toEqual([
      'Más Monedas',
      'Más Victorias',
      'Menos Victorias',
      'Alfabético',
    ]);
  });

  it('does not mutate the source list', () => {
    const source = [profile('Baja', { totalXp: 1 }), profile('Alta', { totalXp: 2 })];
    const ranked = rankProfiles(source);

    expect(source.map((item) => item.name)).toEqual(['Baja', 'Alta']);
    expect(ranked).not.toBe(source);
  });
});
