import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../lib/game/GameProvider';
import type { Player } from '../../lib/game/types';
import PlayerArenaCard from './PlayerArenaCard';

function player(overrides: Partial<Player> = {}): Player {
  return { ...createInitialState().players[0], ...overrides };
}

describe('PlayerArenaCard', () => {
  it('marks the player whose turn it is', () => {
    render(<PlayerArenaCard player={player()} active />);

    expect(screen.getByText('Tu Turno')).toBeInTheDocument();
    expect(screen.queryByText('En Espera')).not.toBeInTheDocument();
  });

  it('marks the waiting player', () => {
    render(<PlayerArenaCard player={player({ id: 1 })} active={false} />);

    expect(screen.getByText('En Espera')).toBeInTheDocument();
    expect(screen.queryByText('Tu Turno')).not.toBeInTheDocument();
  });

  it('shows the name, avatar, score and crown progress', () => {
    render(<PlayerArenaCard player={player({ score: 300, crownTally: 2 })} active />);

    expect(screen.getByRole('heading', { name: 'Jugador 1' })).toBeInTheDocument();
    expect(screen.getByText('account_circle')).toBeInTheDocument();
    expect(screen.getByTestId('arena-score-0')).toHaveTextContent('300');
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('fills only the crowns the player holds', () => {
    render(<PlayerArenaCard player={player({ crowns: ['arte', 'ciencia'] })} active />);

    expect(screen.getByTestId('crown-0-arte')).toHaveAttribute('aria-label', 'Arte: conseguida');
    expect(screen.getByTestId('crown-0-historia')).toHaveAttribute(
      'aria-label',
      'Historia: pendiente',
    );
    expect(screen.getByTestId('crown-0-ciencia')).toHaveAttribute(
      'aria-label',
      'Ciencia: conseguida',
    );
  });

  it('renders the equipped frame and title', () => {
    render(
      <PlayerArenaCard
        player={player({ cosmetics: { frame: 'frame_gold', title: 'title_novato' } })}
        active
      />,
    );

    expect(screen.getByTestId('arena-title-0')).toHaveTextContent('Novato');
    expect(screen.getByText('account_circle').closest('div')).toHaveClass('border-[#F5C542]');
  });

  it('shows answer stats instead of crowns outside coronas mode', () => {
    render(
      <PlayerArenaCard
        player={player({ correctAnswers: 4, streak: 2, bestStreak: 3 })}
        active
        mode="contrarreloj"
      />,
    );

    expect(screen.getByText('Contrarreloj')).toBeInTheDocument();
    expect(screen.queryByText('Coronas')).not.toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });
});
