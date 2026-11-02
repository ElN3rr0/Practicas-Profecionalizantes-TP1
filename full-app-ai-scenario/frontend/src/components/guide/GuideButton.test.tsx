import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GuideButton from './GuideButton';

describe('GuideButton', () => {
  it('opens the guide and closes it from the acknowledgement button', () => {
    render(<GuideButton />);

    expect(screen.queryByTestId('how-to-play')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cómo jugar' }));
    expect(screen.getByTestId('how-to-play')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '¡Entendido!' }));
    expect(screen.queryByTestId('how-to-play')).not.toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<GuideButton label="Ver guía" />);

    expect(screen.getByRole('button', { name: 'Ver guía' })).toBeInTheDocument();
  });
});
