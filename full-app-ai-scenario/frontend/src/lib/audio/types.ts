/** Every sound the game can make. Closed on purpose: one identifier per event. */
export type SoundCue =
  | 'click'
  | 'wheel-spin'
  | 'wheel-land'
  | 'correct'
  | 'incorrect'
  | 'timeout'
  | 'crown'
  | 'powerup'
  | 'ultra'
  | 'victory'
  | 'defeat';

/** Waveform of a single synthesized note. */
export type NoteShape = 'sine' | 'square' | 'sawtooth' | 'triangle';

/**
 * One note of a cue, authored as data so the whole palette can be retuned in one place.
 * A note without `endFrequency` holds `frequency`; with it, the pitch glides there over
 * the note. `startOffset` and `duration` are seconds; `peak` is the envelope peak before
 * the master gain.
 */
export interface Note {
  frequency: number;
  shape: NoteShape;
  startOffset: number;
  duration: number;
  peak: number;
  endFrequency?: number;
}
