import { useCallback, useSyncExternalStore } from 'react';
import { playSound } from './index';
import { isMuted, setMuted, subscribeMuted } from './mute';
import type { SoundCue } from './types';

export interface SoundControls {
  /** Fire-and-forget cue; identical to the module's `playSound`. */
  play: (cue: SoundCue) => void;
  muted: boolean;
  toggleMuted: () => void;
}

/**
 * The mute state every consumer shares. Reading it through `useSyncExternalStore`
 * keeps two mounted controls from drifting apart, since the store is the module,
 * not a per-component `useState`.
 */
export function useSound(): SoundControls {
  const muted = useSyncExternalStore(subscribeMuted, isMuted);
  const toggleMuted = useCallback(() => setMuted(!isMuted()), []);

  return { play: playSound, muted, toggleMuted };
}
