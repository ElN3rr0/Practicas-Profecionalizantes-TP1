import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { drainUnlockListeners, FakeAudioContext, installFakeAudio } from '../../test/fakeAudio';

/** A fresh module per test: the mute value and the audio context both live at module level. */
async function loadAudio() {
  vi.resetModules();
  return import('./index');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  drainUnlockListeners();
  vi.unstubAllGlobals();
});

describe('audio', () => {
  it('stays silent and throws nothing when the platform has no Web Audio', async () => {
    const { playSound, unlockAudio, installUnlockListener } = await loadAudio();

    expect(() => {
      installUnlockListener();
      unlockAudio();
      playSound('correct');
      playSound('victory');
    }).not.toThrow();
  });

  it('constructs no context until the first pointer gesture and exactly one then', async () => {
    const fake = installFakeAudio('suspended');
    const { installUnlockListener } = await loadAudio();

    installUnlockListener();
    expect(fake.instances).toHaveLength(0);

    fireEvent.pointerDown(document.body);

    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].resumeCalls).toBe(1);
    expect(fake.instances[0].state).toBe('running');
  });

  it('unlocks on the first key press too', async () => {
    const fake = installFakeAudio('suspended');
    const { installUnlockListener } = await loadAudio();

    installUnlockListener();
    fireEvent.keyDown(document.body);

    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].resumeCalls).toBe(1);
  });

  it('installs its gesture listeners only once', async () => {
    installFakeAudio();
    const addListener = vi.spyOn(globalThis, 'addEventListener');
    const { installUnlockListener } = await loadAudio();

    installUnlockListener();
    installUnlockListener();

    const unlockOptions = { once: true, capture: true, passive: true };
    expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), unlockOptions);
    expect(addListener).toHaveBeenCalledWith('keydown', expect.any(Function), unlockOptions);
    expect(addListener).toHaveBeenCalledTimes(2);
    addListener.mockRestore();
  });

  it('creates one context however often it is unlocked and resumes a suspended one once', async () => {
    const fake = installFakeAudio('suspended');
    const { unlockAudio } = await loadAudio();

    unlockAudio();
    unlockAudio();

    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].resumeCalls).toBe(1);
  });

  it('drops a cue requested before the unlock instead of replaying it', async () => {
    const fake = installFakeAudio();
    const { playSound, unlockAudio } = await loadAudio();

    playSound('victory');
    expect(fake.instances).toHaveLength(0);

    unlockAudio();
    expect(fake.instances[0].oscillators).toHaveLength(0);

    playSound('victory');
    expect(fake.instances[0].oscillators.length).toBeGreaterThan(0);
  });

  it('requests no cue while the session is muted, and does once it is unmuted', async () => {
    const fake = installFakeAudio();
    const { playSound, setMuted, unlockAudio } = await loadAudio();

    setMuted(true);
    playSound('correct');
    expect(fake.instances).toHaveLength(0);

    unlockAudio();
    const context = fake.instances[0];
    playSound('correct');
    expect(context.oscillators).toHaveLength(0);

    setMuted(false);
    playSound('correct');
    expect(context.oscillators.length).toBeGreaterThan(0);
  });

  it('disables audio instead of breaking the page when the browser refuses to resume', async () => {
    const fake = installFakeAudio('suspended');

    class RefusingAudioContext extends FakeAudioContext {
      override resume(): Promise<void> {
        throw new Error('gesture required');
      }
    }

    vi.stubGlobal('AudioContext', RefusingAudioContext);

    const { playSound, unlockAudio } = await loadAudio();

    expect(() => unlockAudio()).not.toThrow();
    expect(() => playSound('click')).not.toThrow();
    expect(fake.instances[0].oscillators).toHaveLength(0);
  });

  it('plays a cue after the unlock on a fresh call', async () => {
    const fake = installFakeAudio();
    const { playSound, unlockAudio } = await loadAudio();
    unlockAudio();

    playSound('wheel-land');

    expect(fake.instances[0].oscillators).toHaveLength(2);
  });
});
