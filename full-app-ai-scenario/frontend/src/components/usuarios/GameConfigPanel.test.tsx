import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GameProvider, useGame } from '../../lib/game/GameProvider';
import type { GameConfig } from '../../lib/game/types';
import GameConfigPanel from './GameConfigPanel';

function ConfigProbe() {
  const { state } = useGame();
  return <output data-testid="config-probe">{JSON.stringify(state.config)}</output>;
}

function renderPanel() {
  return render(
    <GameProvider>
      <ConfigProbe />
      <GameConfigPanel />
    </GameProvider>,
  );
}

function readConfig(): GameConfig {
  const raw = screen.getByTestId('config-probe').textContent ?? '';
  return JSON.parse(raw) as GameConfig;
}

describe('GameConfigPanel', () => {
  it('renders with the config defaults', () => {
    renderPanel();

    expect(readConfig()).toEqual({ mode: 'coronas', timePerTurn: 20, powerups: [] });
    expect(screen.getByRole('button', { name: '6 Coronas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '20s' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders all five powerups off by default', () => {
    renderPanel();

    for (const label of ['50/50', '2da Chance', '+15s', 'Pasa la pregunta', 'Pista']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('selects the 10 Rondas mode exclusively', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '10 Rondas' }));

    expect(readConfig().mode).toBe('rondas');
    expect(screen.getByRole('button', { name: '10 Rondas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '6 Coronas' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('selects the 30s timer exclusively', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '30s' }));

    expect(readConfig().timePerTurn).toBe(30);
    expect(screen.getByRole('button', { name: '30s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '20s' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('records the 50/50 and Pista powerups in canonical order', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Pista' }));
    fireEvent.click(screen.getByRole('button', { name: '50/50' }));

    expect(readConfig().powerups).toEqual(['fifty-fifty', 'hint']);
    expect(screen.getByRole('button', { name: '50/50' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2da Chance' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('removes a powerup when toggled off', () => {
    renderPanel();

    const fifty = screen.getByRole('button', { name: '50/50' });
    fireEvent.click(fifty);
    fireEvent.click(fifty);

    expect(readConfig().powerups).toEqual([]);
  });
});
