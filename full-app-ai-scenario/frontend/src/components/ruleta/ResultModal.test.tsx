import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import ResultModal from './ResultModal';

describe('ResultModal', () => {
  it('shows the resolved category name, icon, and color', () => {
    render(
      <ResultModal category="geografia" playerName="Ana" onPlay={vi.fn()} onRespin={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Geografía' })).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_ICONS.geografia)).toBeInTheDocument();
    const badge = screen.getByText(CATEGORY_ICONS.geografia).closest('div');
    expect(badge).toHaveStyle({ backgroundColor: CATEGORY_COLORS.geografia });
    expect(screen.getByText(/Ana responderá la pregunta/)).toBeInTheDocument();
  });

  it('offers both actions and wires them to the callbacks', () => {
    const onPlay = vi.fn();
    const onRespin = vi.fn();
    render(<ResultModal category="arte" playerName="Luis" onPlay={onPlay} onRespin={onRespin} />);

    fireEvent.click(screen.getByRole('button', { name: 'Jugar Pregunta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Girar de Nuevo' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onRespin).toHaveBeenCalledTimes(1);
  });

  it('renders the resolved category with its Spanish label', () => {
    render(<ResultModal category="ciencia" playerName="Ana" onPlay={vi.fn()} onRespin={vi.fn()} />);

    expect(screen.getByText(CATEGORY_LABELS.ciencia)).toBeInTheDocument();
  });
});
