import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MUTE_STORAGE_KEY, setMuted } from '../../lib/audio/mute';
import Header from './Header';

const { playSoundMock } = vi.hoisted(() => ({ playSoundMock: vi.fn() }));

vi.mock('../../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/audio')>();
  return { ...actual, playSound: playSoundMock };
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

function renderHeader(initialPath = '/ruleta') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Header />
      <LocationProbe />
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
  it('renders the dashboard home button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
  });

  it('navigates to the start screen when the logo is pressed', () => {
    renderHeader('/ruleta');
    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/');
  });

  it('does not render a page-switching navigation menu', () => {
    renderHeader();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
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
