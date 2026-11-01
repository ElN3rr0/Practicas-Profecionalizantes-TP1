import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyProfile,
  loadProfiles,
  mergeImportedProfiles,
  PROFILES_STORAGE_KEY,
  saveProfiles,
  serializeProfiles,
  validateProfile,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('profile storage', () => {
  it('creates a profile with a unique id independent from the name', () => {
    const first = createEmptyProfile('Ana', 'smart_toy');
    const second = createEmptyProfile('Ana', 'smart_toy');

    expect(first.id).not.toBe(second.id);
    expect(first.totalXp).toBe(0);
    expect(first.totalCoins).toBe(0);
    expect(first.stats.gamesPlayed).toBe(0);
  });

  it('round-trips through localStorage', () => {
    const profile = createEmptyProfile('Ana');
    saveProfiles([profile]);

    expect(loadProfiles()).toEqual([profile]);
  });

  it('recovers from corrupt data', () => {
    localStorage.setItem(PROFILES_STORAGE_KEY, '{not json');
    expect(loadProfiles()).toEqual([]);

    localStorage.setItem(PROFILES_STORAGE_KEY, '{"foo":1}');
    expect(loadProfiles()).toEqual([]);
  });

  it('drops invalid entries but keeps the valid ones', () => {
    const valid = createEmptyProfile('Ana');
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([valid, { id: 1 }, null]));

    expect(loadProfiles()).toEqual([valid]);
  });

  it('deduplicates by id', () => {
    const profile = createEmptyProfile('Ana');
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([profile, profile]));

    expect(loadProfiles()).toHaveLength(1);
  });

  it('exports and imports without duplicating ids', () => {
    const ana = createEmptyProfile('Ana');
    const luis = createEmptyProfile('Luis');
    const exported = serializeProfiles([ana]);

    const first = mergeImportedProfiles([luis], exported);
    expect(first.imported).toBe(1);
    expect(first.profiles).toHaveLength(2);

    const again = mergeImportedProfiles(first.profiles, exported);
    expect(again.imported).toBe(0);
    expect(again.skipped).toBe(1);
    expect(again.profiles).toHaveLength(2);
  });

  it('ignores invalid import payloads', () => {
    const current = [createEmptyProfile('Ana')];
    expect(mergeImportedProfiles(current, 'not json').imported).toBe(0);
  });

  it('validates unusable entries', () => {
    expect(validateProfile(null)).toBeNull();
    expect(validateProfile({ name: 'x' })).toBeNull();
  });
});
