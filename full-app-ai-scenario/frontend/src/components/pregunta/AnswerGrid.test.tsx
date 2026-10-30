import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import AnswerGrid from './AnswerGrid';

const OPTIONS = ['Museo del Louvre', 'Museo de Orsay', 'El Prado', 'La Tate'];

function renderGrid(overrides: Partial<ComponentProps<typeof AnswerGrid>> = {}) {
  const onSelect = vi.fn();
  render(
    <AnswerGrid
      options={OPTIONS}
      selected={null}
      eliminated={[]}
      locked={false}
      onSelect={onSelect}
      {...overrides}
    />,
  );
  return { onSelect };
}

describe('AnswerGrid', () => {
  it('renders the four options as A/B/C/D', () => {
    renderGrid();

    expect(screen.getByRole('button', { name: 'Opción A: Museo del Louvre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opción B: Museo de Orsay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opción C: El Prado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opción D: La Tate' })).toBeInTheDocument();
  });

  it('marks the selected option and reports the index', () => {
    const { onSelect } = renderGrid({ selected: 1 });

    const selected = screen.getByRole('button', { name: 'Opción B: Museo de Orsay' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Opción C: El Prado' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('disables the options removed by the 50/50', () => {
    renderGrid({ eliminated: [1, 3] });

    expect(screen.getByRole('button', { name: 'Opción B: Museo de Orsay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Opción D: La Tate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Opción A: Museo del Louvre' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Opción C: El Prado' })).toBeEnabled();
  });

  it('disables every option while the question is locked', () => {
    renderGrid({ locked: true });

    for (const option of OPTIONS) {
      expect(screen.getByRole('button', { name: new RegExp(option) })).toBeDisabled();
    }
  });

  it('flags a confirmed wrong selection', () => {
    renderGrid({ selected: 2, wrongSelection: true });

    expect(screen.getByTestId('answer-option-2').className).toContain('#E63946');
  });
});
