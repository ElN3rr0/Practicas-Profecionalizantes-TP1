import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MUTE_STORAGE_KEY, setMuted } from './mute';
import { useSound } from './useSound';

const { playSoundMock } = vi.hoisted(() => ({ playSoundMock: vi.fn() }));

vi.mock('./index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./index')>();
  return { ...actual, playSound: playSoundMock };
});

function SoundProbe({ label }: { label: string }) {
  const { play, muted, toggleMuted } = useSound();
  return (
    <div>
      <output data-testid={`muted-${label}`}>{String(muted)}</output>
      <button type="button" onClick={toggleMuted}>
        toggle {label}
      </button>
      <button type="button" onClick={() => play('correct')}>
        play {label}
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  setMuted(false);
  playSoundMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSound', () => {
  it('starts unmuted', () => {
    render(<SoundProbe label="a" />);

    expect(screen.getByTestId('muted-a')).toHaveTextContent('false');
  });

  it('flips the mute, writes the choice and keeps two consumers in step', () => {
    render(
      <>
        <SoundProbe label="a" />
        <SoundProbe label="b" />
      </>,
    );

    act(() => {
      screen.getByRole('button', { name: 'toggle a' }).click();
    });

    expect(screen.getByTestId('muted-a')).toHaveTextContent('true');
    expect(screen.getByTestId('muted-b')).toHaveTextContent('true');
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('true');
  });

  it('hands the cue to the audio module', () => {
    render(<SoundProbe label="a" />);

    act(() => {
      screen.getByRole('button', { name: 'play a' }).click();
    });

    expect(playSoundMock).toHaveBeenCalledWith('correct');
  });
});
