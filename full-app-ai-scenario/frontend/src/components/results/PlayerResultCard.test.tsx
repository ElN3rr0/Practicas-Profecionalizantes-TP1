import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../lib/game/GameProvider';
import type { Player } from '../../lib/game/types';
import PlayerResultCard from './PlayerResultCard';

function player(overrides: Partial<Player> = {}): Player {
  return { ...createInitialState().players[0], ...overrides };
}

describe('PlayerResultCard', () => {
  it('marks the winner and shows the name, score and crowns held', () => {
    render(
      <PlayerResultCard
        player={player({ name: 'Ana', score: 900, crowns: ['arte', 'ciencia'] })}
        mode="coronas"
        roundsWon={0}
        isWinner
      />,
    );

    expect(screen.getByText('Ganador')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
    expect(screen.getByTestId('result-score-0')).toHaveTextContent('900');
    expect(screen.getByText('2 de 6 coronas')).toBeInTheDocument();
    expect(screen.getByTestId('result-crown-0-arte')).toHaveAttribute(
      'aria-label',
      'Arte: conseguida',
    );
    expect(screen.getByTestId('result-crown-0-historia')).toHaveAttribute(
      'aria-label',
      'Historia: pendiente',
    );
  });

  it('marks the other player as a finalist', () => {
    render(
      <PlayerResultCard
        player={player({ id: 1, name: 'Luis' })}
        mode="coronas"
        roundsWon={0}
        isWinner={false}
      />,
    );

    expect(screen.getByText('Finalista')).toBeInTheDocument();
    expect(screen.queryByText('Ganador')).not.toBeInTheDocument();
  });

  it('reports the round-wins instead of the crowns in rondas mode', () => {
    render(<PlayerResultCard player={player({ id: 1 })} mode="rondas" roundsWon={7} isWinner />);

    expect(screen.getByText('Rondas ganadas')).toBeInTheDocument();
    expect(screen.getByText('7 rondas ganadas')).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^result-crown-/)).toHaveLength(0);
  });

  it('lists the six crowns in coronas mode', () => {
    render(<PlayerResultCard player={player()} mode="coronas" roundsWon={0} isWinner />);

    expect(screen.getAllByTestId(/^result-crown-/)).toHaveLength(6);
    expect(screen.queryByText('Rondas ganadas')).not.toBeInTheDocument();
  });
});
