import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../lib/game/GameProvider';
import type { Player } from '../../lib/game/types';
import WinnerBanner from './WinnerBanner';

function player(overrides: Partial<Player> = {}): Player {
  return { ...createInitialState().players[0], ...overrides };
}

describe('WinnerBanner', () => {
  it('declares the winner by name', () => {
    render(
      <WinnerBanner
        player={player({ name: 'Ana', avatar: 'smart_toy', score: 500 })}
        mode="coronas"
        roundWins={[0, 0]}
      />,
    );

    expect(screen.getByRole('heading', { name: '¡Gana Ana!' })).toBeInTheDocument();
    expect(screen.getByText('smart_toy')).toBeInTheDocument();
  });

  it('summarizes the crowns held and the score in coronas mode', () => {
    render(
      <WinnerBanner
        player={player({ crowns: ['arte', 'ciencia'], score: 500 })}
        mode="coronas"
        roundWins={[0, 0]}
      />,
    );

    expect(screen.getByText('Fin de la partida • 6 Coronas')).toBeInTheDocument();
    expect(screen.getByText('2 de 6 coronas')).toBeInTheDocument();
    expect(screen.getByText('500 PTS')).toBeInTheDocument();
  });

  it('summarizes the round-wins of the winning player in rondas mode', () => {
    render(
      <WinnerBanner
        player={player({ id: 1, name: 'Luis', score: 700 })}
        mode="rondas"
        roundWins={[3, 7]}
      />,
    );

    expect(screen.getByText('Fin de la partida • 10 Rondas')).toBeInTheDocument();
    expect(screen.getByText('7 rondas ganadas')).toBeInTheDocument();
    expect(screen.getByText('700 PTS')).toBeInTheDocument();
  });

  it('reports a long sudden-death game without a ten-round denominator', () => {
    render(
      <WinnerBanner player={player({ id: 0, name: 'Ana' })} mode="rondas" roundWins={[8, 7]} />,
    );

    expect(screen.getByText('8 rondas ganadas')).toBeInTheDocument();
    expect(screen.queryByText(/de 10 rondas/)).not.toBeInTheDocument();
  });

  it('declares no winner defensively when no player is given', () => {
    render(<WinnerBanner player={null} mode="coronas" roundWins={[0, 0]} />);

    expect(screen.getByRole('heading', { name: 'Todavía no hay ganador' })).toBeInTheDocument();
    expect(screen.queryByText(/¡Gana/)).not.toBeInTheDocument();
  });
});
