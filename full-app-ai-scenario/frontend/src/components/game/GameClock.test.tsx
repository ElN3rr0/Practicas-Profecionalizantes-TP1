import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameProvider, useGame } from '../../lib/game/GameProvider';
import type { GameState } from '../../lib/game/types';
import { readyGame } from '../../test/gameState';
import GameClock from './GameClock';

function StateProbe() {
  const { state } = useGame();
  return (
    <output data-testid="clock-probe">
      {state.status}:{state.clock}
    </output>
  );
}

function renderClock(state: GameState) {
  return render(
    <GameProvider initialState={state}>
      <MemoryRouter initialEntries={['/pregunta']}>
        <GameClock />
        <StateProbe />
      </MemoryRouter>
    </GameProvider>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('GameClock', () => {
  it('renders only in a running contrarreloj game', () => {
    renderClock({ ...readyGame({ mode: 'coronas' }), clock: 30 });
    expect(screen.queryByTestId('game-clock')).not.toBeInTheDocument();
  });

  it('counts down once per second and stops at zero', () => {
    vi.useFakeTimers();
    renderClock({ ...readyGame({ mode: 'contrarreloj' }), clock: 2 });

    expect(screen.getByTestId('game-clock')).toHaveTextContent('2s');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('game-clock')).toHaveTextContent('1s');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('clock-probe')).toHaveTextContent('ended:0');
    expect(screen.queryByTestId('game-clock')).not.toBeInTheDocument();
  });

  it('is inert when the game has not started', () => {
    renderClock({ ...readyGame({ mode: 'contrarreloj' }), status: 'setup', clock: 90 });
    expect(screen.queryByTestId('game-clock')).not.toBeInTheDocument();
  });
});
