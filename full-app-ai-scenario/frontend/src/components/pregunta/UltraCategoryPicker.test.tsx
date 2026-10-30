import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UltraCategoryPicker from './UltraCategoryPicker';

describe('UltraCategoryPicker', () => {
  it('offers the six categories and reports the pick', () => {
    const onPick = vi.fn();
    render(<UltraCategoryPicker crowns={[]} onPick={onPick} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Ultra desafío' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ultra-option-deportes'));

    expect(onPick).toHaveBeenCalledWith('deportes');
  });

  it('disables the categories already held', () => {
    render(<UltraCategoryPicker crowns={['ciencia']} onPick={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('ultra-option-ciencia')).toBeDisabled();
    expect(screen.getByTestId('ultra-option-arte')).toBeEnabled();
  });

  it('can be cancelled', () => {
    const onCancel = vi.fn();
    render(<UltraCategoryPicker crowns={[]} onPick={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
