import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../../lib/game/GameProvider';
import PlayerStatusCard from './PlayerStatusCard';

function renderCard(id: 0 | 1, active: boolean) {
  return render(
    <GameProvider>
      <PlayerStatusCard id={id} active={active} />
    </GameProvider>,
  );
}

describe('PlayerStatusCard', () => {
  it('shows "Tu Turno" when the player is active', () => {
    renderCard(0, true);

    expect(screen.getByText('Tu Turno')).toBeInTheDocument();
    expect(screen.queryByText('En Espera')).not.toBeInTheDocument();
  });

  it('shows "En Espera" when the player is waiting', () => {
    renderCard(1, false);

    expect(screen.getByText('En Espera')).toBeInTheDocument();
    expect(screen.queryByText('Tu Turno')).not.toBeInTheDocument();
  });

  it('renders the player name, avatar, and score', () => {
    renderCard(0, true);

    expect(screen.getByRole('heading', { name: 'Jugador 1' })).toBeInTheDocument();
    expect(screen.getByText('account_circle')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('PTS')).toBeInTheDocument();
  });
});
