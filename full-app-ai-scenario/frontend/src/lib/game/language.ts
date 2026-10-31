import type { Language } from './types';

/** Default language for the game (the interface is Spanish-branded). */
export const DEFAULT_LANGUAGE: Language = 'es';

export const LANGUAGE_STORAGE_KEY = 'aver-si-sabes:language';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'es';
}

/** Reads the player's saved language preference, falling back to the default. */
export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Persists the player's language preference so it survives reloads. */
export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage may be unavailable (private mode); the in-memory choice still applies.
  }
}
