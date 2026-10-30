import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MUTE_STORAGE_KEY } from './mute';

/** A fresh module per test: the mute value is read once, when the module loads. */
async function loadMute() {
  vi.resetModules();
  return import('./mute');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('mute state', () => {
  it('starts unmuted when storage holds nothing', async () => {
    const { isMuted } = await loadMute();

    expect(isMuted()).toBe(false);
  });

  it('persists the choice under one namespaced key and notifies subscribers', async () => {
    const { isMuted, setMuted, subscribeMuted } = await loadMute();
    const listener = vi.fn();
    subscribeMuted(listener);

    setMuted(true);

    expect(isMuted()).toBe(true);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('true');
    expect(listener).toHaveBeenCalledWith(true);

    setMuted(false);

    expect(isMuted()).toBe(false);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('false');
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('does not notify when the value does not change', async () => {
    const { setMuted, subscribeMuted } = await loadMute();
    const listener = vi.fn();
    subscribeMuted(listener);

    setMuted(false);

    expect(listener).not.toHaveBeenCalled();
  });

  it('reads a stored muted choice when the app starts again', async () => {
    localStorage.setItem(MUTE_STORAGE_KEY, 'true');

    const { isMuted } = await loadMute();

    expect(isMuted()).toBe(true);
  });

  it('keeps working for the session when storage refuses every access', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { isMuted, setMuted, subscribeMuted } = await loadMute();
    const listener = vi.fn();
    subscribeMuted(listener);

    expect(isMuted()).toBe(false);
    expect(() => setMuted(true)).not.toThrow();
    expect(isMuted()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('stops notifying an unsubscribed listener', async () => {
    const { setMuted, subscribeMuted } = await loadMute();
    const listener = vi.fn();
    const unsubscribe = subscribeMuted(listener);

    unsubscribe();
    setMuted(true);

    expect(listener).not.toHaveBeenCalled();
  });
});
