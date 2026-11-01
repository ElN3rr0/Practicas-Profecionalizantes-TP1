import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CategoryName } from '../../lib/game/types';
import CrownPicker from './CrownPicker';

const CATEGORIES: CategoryName[] = [
  'arte',
  'historia',
  'deportes',
  'entretenimiento',
  'geografia',
  'ciencia',
];

function renderPicker(crowns: readonly CategoryName[] = []) {
  const onPick = vi.fn();
  const onStartUltra = vi.fn();
  render(<CrownPicker crowns={crowns} onPick={onPick} onStartUltra={onStartUltra} />);
  return { onPick, onStartUltra };
}

describe('CrownPicker', () => {
  it('offers the six categories to pick a crown', () => {
    renderPicker();

    expect(screen.getByRole('dialog', { name: 'Elegí tu corona' })).toBeInTheDocument();
    for (const category of CATEGORIES) {
      expect(screen.getByTestId(`crown-option-${category}`)).toBeEnabled();
    }
  });

  it('reports the chosen crown category', () => {
    const { onPick, onStartUltra } = renderPicker(['arte']);

    fireEvent.click(screen.getByTestId('crown-option-historia'));

    expect(onPick).toHaveBeenCalledWith('historia');
    expect(onStartUltra).not.toHaveBeenCalled();
  });

  it('blocks the crowns the player already holds', () => {
    renderPicker(['arte', 'geografia']);

    expect(screen.getByTestId('crown-option-arte')).toBeDisabled();
    expect(screen.getByTestId('crown-option-geografia')).toBeDisabled();
    expect(screen.getByTestId('crown-option-ciencia')).toBeEnabled();
  });

  it('unlocks the ultra desafío at the 3-win moment and starts it with a category', () => {
    const { onPick, onStartUltra } = renderPicker();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    expect(screen.getByRole('dialog', { name: 'Ultra desafío' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('crown-option-historia'));
    expect(onStartUltra).toHaveBeenCalledWith('historia');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('can go back to the normal crown choice', () => {
    renderPicker();

    fireEvent.click(screen.getByTestId('toggle-ultra'));
    fireEvent.click(screen.getByTestId('toggle-ultra'));

    expect(screen.getByRole('dialog', { name: 'Elegí tu corona' })).toBeInTheDocument();
  });
});
