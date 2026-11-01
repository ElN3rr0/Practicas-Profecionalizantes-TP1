import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameProvider, PLAYER_AVATARS } from '../../lib/game/GameProvider';
import { ProfilesProvider } from '../../lib/profiles/ProfilesProvider';
import { createEmptyProfile, saveProfiles } from '../../lib/profiles/storage';
import PlayerCard from './PlayerCard';

beforeEach(() => {
  localStorage.clear();
});

function renderPlayerCard(id: 0 | 1, label: string) {
  return render(
    <ProfilesProvider>
      <GameProvider>
        <MemoryRouter>
          <PlayerCard
            id={id}
            label={label}
            sideLabel={id === 0 ? 'Lado Izquierdo' : 'Lado Derecho'}
          />
        </MemoryRouter>
      </GameProvider>
    </ProfilesProvider>,
  );
}

describe('PlayerCard', () => {
  it('renders the label, side badge, name field, and avatar options', () => {
    renderPlayerCard(0, 'Jugador 1');

    expect(screen.getByText('Jugador 1')).toBeInTheDocument();
    expect(screen.getByText('Lado Izquierdo')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de Jugador 1')).toBeInTheDocument();
    for (const avatar of PLAYER_AVATARS[0]) {
      expect(
        screen.getByRole('button', { name: `Seleccionar avatar ${avatar}` }),
      ).toBeInTheDocument();
    }
  });

  it('defaults the name placeholder to the player default', () => {
    renderPlayerCard(1, 'Jugador 2');

    expect(screen.getByLabelText('Nombre de Jugador 2')).toHaveAttribute(
      'placeholder',
      'Jugador 2',
    );
  });

  it('enters a name and round-trips it through the provider', () => {
    renderPlayerCard(0, 'Jugador 1');

    const input = screen.getByLabelText('Nombre de Jugador 1');
    fireEvent.change(input, { target: { value: 'Ana' } });

    expect(input).toHaveValue('Ana');
  });

  it('selects an avatar and reflects it in the avatar ring', () => {
    renderPlayerCard(0, 'Jugador 1');

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar smart_toy' }));

    expect(screen.getByLabelText('Avatar de Jugador 1')).toHaveTextContent('smart_toy');
    expect(screen.getByRole('button', { name: 'Seleccionar avatar smart_toy' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps avatar selection exclusive within a player', () => {
    renderPlayerCard(0, 'Jugador 1');
    const picker = screen
      .getByRole('button', { name: 'Seleccionar avatar smart_toy' })
      .closest('div') as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar smart_toy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar psychology' }));

    const pressed = within(picker)
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName('Seleccionar avatar psychology');
  });

  it('keeps selection independent between the two players', () => {
    render(
      <ProfilesProvider>
        <GameProvider>
          <MemoryRouter>
            <PlayerCard id={0} label="Jugador 1" sideLabel="Lado Izquierdo" />
            <PlayerCard id={1} label="Jugador 2" sideLabel="Lado Derecho" />
          </MemoryRouter>
        </GameProvider>
      </ProfilesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar smart_toy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar emoji_events' }));

    expect(screen.getByLabelText('Avatar de Jugador 1')).toHaveTextContent('smart_toy');
    expect(screen.getByLabelText('Avatar de Jugador 2')).toHaveTextContent('emoji_events');
  });

  it('plays as guest by default and explains that nothing is saved', () => {
    renderPlayerCard(0, 'Jugador 1');

    expect(screen.getByText(/Jugando como invitado/)).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil local')).toHaveValue('__guest__');
  });

  it('selects an existing profile and loads its name and level', () => {
    const profile = createEmptyProfile('Ana', 'psychology');
    saveProfiles([profile]);
    renderPlayerCard(0, 'Jugador 1');

    fireEvent.change(screen.getByLabelText('Perfil local'), { target: { value: profile.id } });

    expect(screen.getByLabelText('Nombre de Jugador 1')).toHaveValue('Ana');
    expect(screen.getByRole('button', { name: 'Seleccionar avatar psychology' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(/Nivel 1/)).toBeInTheDocument();
  });

  it('creates a new profile from the card and selects it', () => {
    renderPlayerCard(0, 'Jugador 1');

    fireEvent.change(screen.getByLabelText('Perfil local'), { target: { value: '__create__' } });
    fireEvent.change(screen.getByLabelText('Nombre del perfil de Jugador 1'), {
      target: { value: 'Seba' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByLabelText('Nombre de Jugador 1')).toHaveValue('Seba');
    expect(screen.getByLabelText('Perfil local')).not.toHaveValue('__guest__');
  });

  it('deletes the selected profile and falls back to guest', () => {
    const profile = createEmptyProfile('Ana');
    saveProfiles([profile]);
    renderPlayerCard(0, 'Jugador 1');
    fireEvent.change(screen.getByLabelText('Perfil local'), { target: { value: profile.id } });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar perfil' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Perfil local')).toHaveValue('__guest__');
    confirmSpy.mockRestore();
  });

  it('shows the equipped title and frame of the selected profile', () => {
    const profile = createEmptyProfile('Ana');
    saveProfiles([{ ...profile, equipped: { frame: 'frame_gold', title: 'title_novato' } }]);
    renderPlayerCard(0, 'Jugador 1');
    fireEvent.change(screen.getByLabelText('Perfil local'), { target: { value: profile.id } });

    expect(screen.getByTestId('equipped-title-0')).toHaveTextContent('Novato');
    expect(screen.getByLabelText('Avatar de Jugador 1')).toHaveClass('border-[#F5C542]');
  });
});
