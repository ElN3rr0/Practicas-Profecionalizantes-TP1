/** One namespaced boolean, the only thing this app persists. */
export const MUTE_STORAGE_KEY = 'aver-si-sabes:muted';

type MuteListener = (muted: boolean) => void;

const listeners = new Set<MuteListener>();

/**
 * Read once at load. Private-mode storage can throw on access, and a missing value
 * means unmuted, so the in-memory value stays authoritative for the session.
 */
function readStoredMute(): boolean {
  try {
    return globalThis.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let muted = readStoredMute();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  if (next === muted) return;
  muted = next;

  try {
    globalThis.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  } catch {
    // Storage refused the write; the session keeps the choice in memory.
  }

  for (const listener of listeners) listener(muted);
}

/** Registers a listener and returns the unsubscribe function `useSyncExternalStore` needs. */
export function subscribeMuted(listener: MuteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
