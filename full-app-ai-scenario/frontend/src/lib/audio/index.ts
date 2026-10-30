import { isMuted } from './mute';
import { disableAudio, ensureAudio, playCue } from './synth';
import type { SoundCue } from './types';

export { MUTE_STORAGE_KEY, isMuted, setMuted, subscribeMuted } from './mute';
export type { SoundCue } from './types';

const UNLOCK_EVENTS = ['pointerdown', 'keydown'] as const;
const UNLOCK_OPTIONS: AddEventListenerOptions = { once: true, capture: true, passive: true };

let unlockListenerInstalled = false;

/**
 * Fire-and-forget: nothing can await a cue, and a muted session returns before the
 * platform is touched at all.
 */
export function playSound(cue: SoundCue): void {
  if (isMuted()) return;
  playCue(cue);
}

/**
 * Creates the page's audio context — and resumes it when the browser left it suspended —
 * so it must be called from inside a user gesture. Idempotent.
 */
export function unlockAudio(): void {
  const nodes = ensureAudio();
  if (nodes === null || nodes.context.state !== 'suspended') return;

  try {
    void nodes.context.resume().catch(() => {});
  } catch {
    disableAudio();
  }
}

/** Registers one-shot gesture listeners that unlock audio. Idempotent. */
export function installUnlockListener(): void {
  if (unlockListenerInstalled) return;
  unlockListenerInstalled = true;

  for (const event of UNLOCK_EVENTS) {
    globalThis.addEventListener(event, unlockAudio, UNLOCK_OPTIONS);
  }
}
