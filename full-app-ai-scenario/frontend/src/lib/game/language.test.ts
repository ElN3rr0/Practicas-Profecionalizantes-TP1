import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  readStoredLanguage,
  storeLanguage,
} from './language';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('language preference', () => {
  it('defaults to Spanish when nothing is stored', () => {
    expect(DEFAULT_LANGUAGE).toBe('es');
    expect(readStoredLanguage()).toBe('es');
  });

  it('reads a stored valid language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    expect(readStoredLanguage()).toBe('en');
  });

  it('falls back to the default for an invalid stored value', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    expect(readStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('persists the chosen language under the storage key', () => {
    storeLanguage('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('narrows only en and es', () => {
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it('falls back to the default when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });
});
