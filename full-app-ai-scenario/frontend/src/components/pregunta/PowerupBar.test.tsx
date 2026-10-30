import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { emptyPowerupInventory } from '../../lib/game/GameProvider';
import type { PowerupId } from '../../lib/game/types';
import PowerupBar from './PowerupBar';

const ALL: PowerupId[] = ['fifty-fifty', 'second-chance', 'plus-time', 'skip-question', 'hint'];

function inventory(overrides: Partial<Record<PowerupId, number>> = {}) {
  return { ...emptyPowerupInventory(), ...overrides };
}

function renderBar(
  overrides: Partial<{
    inventory: ReturnType<typeof inventory>;
    enabled: PowerupId[];
    disabled: boolean;
    onUse: (id: PowerupId) => void;
  }> = {},
) {
  const onUse = overrides.onUse ?? vi.fn();
  render(
    <PowerupBar
      inventory={overrides.inventory ?? inventory(Object.fromEntries(ALL.map((id) => [id, 1])))}
      enabled={overrides.enabled ?? ALL}
      disabled={overrides.disabled ?? false}
      onUse={onUse}
    />,
  );
  return { onUse };
}

describe('PowerupBar', () => {
  it('renders the five comodines with their remaining charges', () => {
    renderBar();

    expect(screen.getByTestId('powerup-fifty-fifty')).toHaveTextContent('50/50');
    expect(screen.getByTestId('powerup-second-chance')).toHaveTextContent('2da Chance');
    expect(screen.getByTestId('powerup-plus-time')).toHaveTextContent('+15s');
    expect(screen.getByTestId('powerup-skip-question')).toHaveTextContent('Pasa la pregunta');
    expect(screen.getByTestId('powerup-hint')).toHaveTextContent('Pista');
  });

  it('fires the activatable comodín', () => {
    const { onUse } = renderBar();

    fireEvent.click(screen.getByTestId('powerup-fifty-fifty'));
    expect(onUse).toHaveBeenCalledWith('fifty-fifty');
  });

  it('disables a comodín the game did not enable', () => {
    const { onUse } = renderBar({ enabled: ['hint'] });

    const fifty = screen.getByTestId('powerup-fifty-fifty');
    expect(fifty).toBeDisabled();
    fireEvent.click(fifty);
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByTestId('powerup-hint')).toBeEnabled();
  });

  it('disables a comodín with no remaining charge', () => {
    renderBar({ inventory: inventory({ hint: 0 }) });

    expect(screen.getByTestId('powerup-hint')).toBeDisabled();
  });

  it('disables every control while the question is locked', () => {
    const { onUse } = renderBar({ disabled: true });

    for (const id of ALL.filter((powerup) => powerup !== 'second-chance')) {
      const control = screen.getByTestId(`powerup-${id}`);
      expect(control).toBeDisabled();
      fireEvent.click(control);
    }
    expect(onUse).not.toHaveBeenCalled();
  });

  it('shows the reactive 2da Chance as a charge indicator, not a button', () => {
    renderBar();

    expect(screen.queryByRole('button', { name: /2da Chance/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('powerup-second-chance')).toHaveAttribute(
      'aria-label',
      '2da Chance, automática, 1 disponible',
    );
  });
});
