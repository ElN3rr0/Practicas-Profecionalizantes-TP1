import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MUTE_STORAGE_KEY, setMuted } from '../../lib/audio/mute';
import { ProfilesProvider } from '../../lib/profiles/ProfilesProvider';
import { createEmptyProfile, saveProfiles } from '../../lib/profiles/storage';
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
      <ProfilesProvider>
        <Header />
        <LocationProbe />
      </ProfilesProvider>
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

  it('opens the global ranking ordered by experience', () => {
    const low = { ...createEmptyProfile('Baja'), totalXp: 10 };
    const high = { ...createEmptyProfile('Alta'), totalXp: 900 };
    saveProfiles([low, high]);

    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ranking global' }));

    const dialog = screen.getByRole('dialog', { name: 'Ranking global de perfiles' });
    const rows = within(dialog).getAllByTestId(/^ranking-row-/);
    expect(rows[0]).toHaveTextContent('Alta');
    expect(rows[1]).toHaveTextContent('Baja');
    expect(within(dialog).getByText('2 perfiles cargados')).toBeInTheDocument();
  });

  it('explains the empty ranking and closes it', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir ranking global' }));
    expect(screen.getByTestId('ranking-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ranking' }));
    expect(screen.queryByTestId('ranking-modal')).not.toBeInTheDocument();
  });
});
