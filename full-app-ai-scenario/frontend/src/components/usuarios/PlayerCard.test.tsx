import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GameProvider, PLAYER_AVATARS } from '../../lib/game/GameProvider';
import PlayerCard from './PlayerCard';

function renderPlayerCard(id: 0 | 1, label: string) {
  return render(
    <GameProvider>
      <PlayerCard id={id} label={label} sideLabel={id === 0 ? 'Lado Izquierdo' : 'Lado Derecho'} />
    </GameProvider>,
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
      <GameProvider>
        <PlayerCard id={0} label="Jugador 1" sideLabel="Lado Izquierdo" />
        <PlayerCard id={1} label="Jugador 2" sideLabel="Lado Derecho" />
      </GameProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar smart_toy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar avatar emoji_events' }));

    expect(screen.getByLabelText('Avatar de Jugador 1')).toHaveTextContent('smart_toy');
    expect(screen.getByLabelText('Avatar de Jugador 2')).toHaveTextContent('emoji_events');
  });
});
