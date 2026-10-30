import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeGainNode, installFakeAudio } from '../../test/fakeAudio';
import type { SoundCue } from './types';

/** A fresh module per test: the synthesizer keeps its context and disable flag at module level. */
async function loadSynth() {
  vi.resetModules();
  return import('./synth');
}

function cuesOf(notes: Record<string, unknown>): SoundCue[] {
  return Object.keys(notes) as SoundCue[];
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('synth', () => {
  it('synthesizes every cue from oscillators through a gain into the destination', async () => {
    const fake = installFakeAudio();
    const { CUE_NOTES, ensureAudio, playCue } = await loadSynth();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(ensureAudio()).not.toBeNull();
    const context = fake.instances[0];
    expect(fake.instances).toHaveLength(1);

    const master = context.gains[0];
    expect(master.gain.value).toBeCloseTo(0.18);
    expect(master.connections).toContain(context.destination);

    const cues = cuesOf(CUE_NOTES);
    expect(cues).toHaveLength(11);

    for (const cue of cues) {
      const before = context.oscillators.length;
      playCue(cue);
      expect(context.oscillators.length, `cue ${cue} scheduled nothing`).toBeGreaterThan(before);
    }

    for (const oscillator of context.oscillators) {
      const gain = oscillator.connections[0];
      expect(gain).toBeInstanceOf(FakeGainNode);
      expect((gain as FakeGainNode).connections).toContain(master);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never ramps a gain or a pitch to zero', async () => {
    const fake = installFakeAudio();
    const { CUE_NOTES, ensureAudio, playCue } = await loadSynth();
    ensureAudio();
    const context = fake.instances[0];

    for (const cue of cuesOf(CUE_NOTES)) playCue(cue);

    for (const oscillator of context.oscillators) {
      for (const event of oscillator.frequency.events) {
        expect(event.value).toBeGreaterThan(0);
      }
      const gain = oscillator.connections[0] as FakeGainNode;
      const ramps = gain.gain.events.filter((event) => event.kind === 'ramp');
      expect(ramps.length).toBeGreaterThan(0);
      for (const event of gain.gain.events) {
        expect(event.value).toBeGreaterThan(0);
      }
    }
  });

  it('stops each oscillator after it starts and disconnects the pair when it ends', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    ensureAudio();
    playCue('victory');

    const context = fake.instances[0];
    expect(context.oscillators).toHaveLength(4);

    for (const oscillator of context.oscillators) {
      expect(oscillator.startedAt).not.toBeNull();
      expect(oscillator.stoppedAt as number).toBeGreaterThan(oscillator.startedAt as number);
    }

    for (const oscillator of context.oscillators) {
      const gain = oscillator.connections[0] as FakeGainNode;
      expect(oscillator.onended).not.toBeNull();
      oscillator.onended?.();
      expect(oscillator.disconnected).toBe(true);
      expect(gain.disconnected).toBe(true);
    }
  });

  it('sequences the notes of an arpeggio one after another', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    ensureAudio();
    playCue('correct');

    const starts = fake.instances[0].oscillators.map((oscillator) => oscillator.startedAt);
    expect(starts).toEqual([0, 0.09, 0.18]);
  });

  it('glides the pitch of a sweep instead of holding it', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    ensureAudio();
    playCue('wheel-spin');

    const [oscillator] = fake.instances[0].oscillators;
    expect(oscillator.frequency.events).toEqual([
      { kind: 'set', value: 180, time: 0 },
      { kind: 'ramp', value: 520, time: 0.35 },
    ]);
  });

  it('keeps every cue shorter than 1.2 seconds', async () => {
    const { CUE_NOTES } = await loadSynth();

    for (const cue of cuesOf(CUE_NOTES)) {
      const length = Math.max(...CUE_NOTES[cue].map((note) => note.startOffset + note.duration));
      expect(length, `cue ${cue}`).toBeLessThanOrEqual(1.2);
    }
  });

  it('ignores an identifier outside the cue union', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    ensureAudio();

    expect(() => playCue('explosion' as SoundCue)).not.toThrow();
    expect(fake.instances[0].oscillators).toHaveLength(0);
  });

  it('constructs no context on import and drops cues until one exists', async () => {
    const fake = installFakeAudio();
    const { playCue } = await loadSynth();

    expect(fake.instances).toHaveLength(0);

    playCue('click');

    expect(fake.instances).toHaveLength(0);
  });

  it('creates exactly one context however many cues play', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();

    expect(ensureAudio()).not.toBeNull();
    expect(ensureAudio()).not.toBeNull();
    playCue('click');
    expect(fake.instances).toHaveLength(1);
  });

  it('drops a repeated cue inside the coalescing window and honours it afterwards', async () => {
    vi.useFakeTimers();
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    ensureAudio();

    playCue('click');
    const afterFirst = fake.instances[0].oscillators.length;
    playCue('click');
    expect(fake.instances[0].oscillators.length).toBe(afterFirst);

    vi.advanceTimersByTime(30);
    playCue('click');
    expect(fake.instances[0].oscillators.length).toBe(afterFirst * 2);
  });

  it('disables itself when the platform refuses to construct a context', async () => {
    const { ensureAudio, playCue } = await loadSynth();
    const refusing = vi.fn(function refusingContext() {
      throw new Error('too many contexts');
    });
    vi.stubGlobal('AudioContext', refusing);

    expect(ensureAudio()).toBeNull();
    expect(ensureAudio()).toBeNull();
    expect(refusing).toHaveBeenCalledTimes(1);
    expect(() => playCue('click')).not.toThrow();
  });

  it('disables itself when a scheduling call throws', async () => {
    const fake = installFakeAudio();
    const { ensureAudio, playCue } = await loadSynth();
    expect(ensureAudio()).not.toBeNull();
    const context = fake.instances[0];

    context.createOscillator = () => {
      throw new Error('node limit reached');
    };

    expect(() => playCue('correct')).not.toThrow();

    // A disabled module must not reach the platform at all on later cues.
    const laterSchedule = vi.fn(() => {
      throw new Error('still refusing');
    });
    context.createOscillator = laterSchedule;

    expect(() => playCue('incorrect')).not.toThrow();
    expect(laterSchedule).not.toHaveBeenCalled();
  });
});
