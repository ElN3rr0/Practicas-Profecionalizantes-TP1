import { vi } from 'vitest';

export interface ParamEvent {
  kind: 'set' | 'ramp';
  value: number;
  time: number;
}

/** Records scheduling calls so a test can assert the envelope it was given. */
export class FakeAudioParam {
  readonly events: ParamEvent[] = [];
  value = 0;

  setValueAtTime(value: number, time: number): void {
    this.events.push({ kind: 'set', value, time });
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.events.push({ kind: 'ramp', value, time });
    this.value = value;
  }
}

export class FakeGainNode {
  readonly gain = new FakeAudioParam();
  readonly connections: unknown[] = [];
  disconnected = false;

  connect(node: unknown): void {
    this.connections.push(node);
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

export class FakeOscillatorNode {
  type = 'sine';
  readonly frequency = new FakeAudioParam();
  readonly connections: unknown[] = [];
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  disconnected = false;
  onended: (() => void) | null = null;

  connect(node: unknown): void {
    this.connections.push(node);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  start(time: number): void {
    this.startedAt = time;
  }

  stop(time: number): void {
    this.stoppedAt = time;
  }
}

/** A stand-in for the platform `AudioContext`, small enough to reason about. */
export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static initialState: 'running' | 'suspended' = 'running';

  currentTime = 0;
  state: 'running' | 'suspended' | 'closed';
  readonly destination = { name: 'destination' };
  readonly oscillators: FakeOscillatorNode[] = [];
  readonly gains: FakeGainNode[] = [];
  resumeCalls = 0;

  constructor() {
    this.state = FakeAudioContext.initialState;
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): FakeOscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }
}

/** Installs the fake on the global scope and clears the instances of any earlier test. */
export function installFakeAudio(initialState: 'running' | 'suspended' = 'running') {
  FakeAudioContext.instances = [];
  FakeAudioContext.initialState = initialState;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return FakeAudioContext;
}

/**
 * Consumes the one-shot gesture listeners a test may have installed. Listeners left
 * behind would unlock a later test's module instance from under it.
 */
export function drainUnlockListeners(): void {
  globalThis.dispatchEvent(new Event('pointerdown'));
  globalThis.dispatchEvent(new Event('keydown'));
}
