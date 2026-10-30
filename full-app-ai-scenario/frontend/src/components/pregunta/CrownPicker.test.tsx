import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CrownPicker from './CrownPicker';

describe('CrownPicker', () => {
  it('offers the six categories', () => {
    render(<CrownPicker crowns={[]} onPick={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Elegí tu corona' })).toBeInTheDocument();
    for (const category of [
      'arte',
      'historia',
      'deportes',
      'entretenimiento',
      'geografia',
      'ciencia',
    ]) {
      expect(screen.getByTestId(`crown-option-${category}`)).toBeEnabled();
    }
  });

  it('blocks the crowns the player already holds', () => {
    render(<CrownPicker crowns={['arte', 'geografia']} onPick={vi.fn()} />);

    expect(screen.getByTestId('crown-option-arte')).toBeDisabled();
    expect(screen.getByTestId('crown-option-geografia')).toBeDisabled();
    expect(screen.getByTestId('crown-option-ciencia')).toBeEnabled();
  });

  it('reports the chosen category', () => {
    const onPick = vi.fn();
    render(<CrownPicker crowns={['arte']} onPick={onPick} />);

    fireEvent.click(screen.getByTestId('crown-option-historia'));

    expect(onPick).toHaveBeenCalledWith('historia');
  });
});
