import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MUTE_STORAGE_KEY, setMuted } from '../../lib/audio/mute';
import Header from './Header';

const { playSoundMock } = vi.hoisted(() => ({ playSoundMock: vi.fn() }));

vi.mock('../../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/audio')>();
  return { ...actual, playSound: playSoundMock };
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

function muteToggle() {
  return screen.getByRole('button', { name: 'Silenciar sonidos' });
}

beforeEach(() => {
  localStorage.clear();
  setMuted(false);
  playSoundMock.mockClear();
});

describe('Header', () => {
  it('renders the VS mark and the title', () => {
    renderHeader();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getByText('A Ver Si Sabés')).toBeInTheDocument();
  });

  it('renders navigation links to all five routes', () => {
    renderHeader();
    for (const label of ['Inicio', 'Usuarios', 'Ruleta', 'Pregunta', 'Resultados']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('requests one click cue per navigation', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('link', { name: 'Ruleta' }));

    expect(playSoundMock).toHaveBeenCalledTimes(1);
    expect(playSoundMock).toHaveBeenCalledWith('click');
  });

  it('exposes the mute choice as a pressed state on a native button', () => {
    renderHeader();

    expect(muteToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(muteToggle()).toHaveTextContent('volume_up');

    fireEvent.click(muteToggle());

    expect(muteToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(muteToggle()).toHaveTextContent('volume_off');
  });

  it('persists the choice and keeps it across a remount', () => {
    const { unmount } = renderHeader();
    fireEvent.click(muteToggle());
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('true');

    unmount();
    renderHeader();

    expect(muteToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders pressed when the session is already muted', () => {
    setMuted(true);

    renderHeader();

    expect(muteToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('requests a click cue only when the press turns sound back on', () => {
    renderHeader();

    fireEvent.click(muteToggle());
    expect(playSoundMock).not.toHaveBeenCalled();

    fireEvent.click(muteToggle());
    expect(playSoundMock).toHaveBeenCalledTimes(1);
    expect(playSoundMock).toHaveBeenCalledWith('click');
  });
});
