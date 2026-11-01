import type { Note, NoteShape, SoundCue } from './types';

/** Level every cue is attenuated to, so the game is audible but never startling. */
const MASTER_GAIN = 0.18;

/** Exponential ramps need a positive target; zero throws, so the envelope floors here. */
const ENVELOPE_FLOOR = 0.0001;

/** Time the envelope takes to reach its peak, short enough to read as a strike. */
const ATTACK_SECONDS = 0.008;

/** Extra time an oscillator keeps running past its note, so the tail is never clipped. */
const RELEASE_TAIL_SECONDS = 0.02;

/** A repeated cue inside this window is a double click, not a second event. */
const COALESCE_MS = 30;

interface AudioNodes {
  context: AudioContext;
  master: GainNode;
}

/** Notes played one after another, each `duration` seconds long. */
const sequence = (
  shape: NoteShape,
  peak: number,
  duration: number,
  frequencies: number[],
): Note[] =>
  frequencies.map((frequency, index) => ({
    frequency,
    shape,
    startOffset: index * duration,
    duration,
    peak,
  }));

/** A single note whose pitch glides from `from` to `to`. */
const glide = (
  shape: NoteShape,
  peak: number,
  duration: number,
  from: number,
  to: number,
  startOffset = 0,
): Note => ({ frequency: from, endFrequency: to, shape, startOffset, duration, peak });

/** The authored palette. Tunable here without touching a single screen. */
export const CUE_NOTES: Record<SoundCue, readonly Note[]> = {
  click: sequence('square', 0.5, 0.03, [880]),
  'wheel-spin': [glide('sawtooth', 0.3, 0.35, 180, 520)],
  'wheel-land': sequence('sine', 0.6, 0.09, [660, 990]),
  correct: sequence('triangle', 0.7, 0.09, [523, 659, 784]),
  incorrect: [glide('sawtooth', 0.7, 0.25, 180, 110)],
  timeout: [glide('square', 0.6, 0.4, 300, 150)],
  crown: sequence('sine', 0.6, 0.07, [784, 988, 1175, 1568]),
  powerup: [glide('sine', 0.5, 0.12, 400, 900)],
  ultra: [glide('sawtooth', 0.8, 0.25, 110, 220), glide('sawtooth', 0.8, 0.25, 220, 110, 0.25)],
  victory: sequence('triangle', 0.7, 0.14, [523, 659, 784, 1047]),
  defeat: sequence('triangle', 0.5, 0.18, [392, 330, 262]),
  'level-up': sequence('sine', 0.7, 0.1, [659, 784, 988, 1319]),
  achievement: sequence('triangle', 0.6, 0.08, [880, 1109, 1319]),
};

let audio: AudioNodes | null = null;
let disabled = false;
const lastRequestedAt = new Map<SoundCue, number>();

/**
 * The page's single audio context, created on first use. Reading the platform API
 * happens here rather than at import time so that loading the module touches nothing.
 * A missing or throwing implementation disables sound for the rest of the session,
 * which keeps a hostile environment from raising an error on every event.
 */
export function ensureAudio(): AudioNodes | null {
  if (disabled) return null;
  if (audio !== null) return audio;

  const Context = globalThis.AudioContext;
  if (typeof Context !== 'function') {
    disabled = true;
    return null;
  }

  try {
    const context = new Context();
    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);
    audio = { context, master };
    return audio;
  } catch {
    disabled = true;
    return null;
  }
}

/** Stops every later cue. Used when the platform refuses to cooperate mid-session. */
export function disableAudio(): void {
  disabled = true;
  audio = null;
}

function scheduleNote({ context, master }: AudioNodes, note: Note, start: number): void {
  const at = start + note.startOffset;
  const endsAt = at + note.duration;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = note.shape;
  oscillator.frequency.setValueAtTime(note.frequency, at);
  if (note.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, endsAt);
  }

  gain.gain.setValueAtTime(ENVELOPE_FLOOR, at);
  gain.gain.exponentialRampToValueAtTime(note.peak, at + ATTACK_SECONDS);
  gain.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, endsAt);

  oscillator.connect(gain);
  gain.connect(master);

  oscillator.start(at);
  oscillator.stop(endsAt + RELEASE_TAIL_SECONDS);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/**
 * Schedules one cue against the audio clock and returns immediately. The context is
 * never created here: a cue requested before the unlock is dropped, not queued, because
 * replaying a backlog after the unlock would emit a burst of stale sounds.
 */
export function playCue(cue: SoundCue): void {
  const cueNotes: readonly Note[] | undefined = CUE_NOTES[cue];
  if (cueNotes === undefined) return;

  const nodes = audio;
  if (nodes === null) return;

  const now = Date.now();
  const previous = lastRequestedAt.get(cue);
  if (previous !== undefined && now - previous < COALESCE_MS) return;
  lastRequestedAt.set(cue, now);

  try {
    const start = nodes.context.currentTime;
    for (const note of cueNotes) scheduleNote(nodes, note, start);
  } catch {
    disableAudio();
  }
}
