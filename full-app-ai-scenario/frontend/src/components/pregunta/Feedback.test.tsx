import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Feedback from './Feedback';

describe('Feedback', () => {
  it('renders a status message with the requested tone', () => {
    render(<Feedback tone="wrong">Respuesta incorrecta</Feedback>);

    expect(screen.getByRole('status')).toHaveTextContent('Respuesta incorrecta');
    expect(screen.getByTestId('feedback-wrong').className).toContain('#E63946');
  });

  it('renders the informational tone', () => {
    render(<Feedback tone="info">Ultra desafío activo</Feedback>);

    expect(screen.getByRole('status')).toHaveTextContent('Ultra desafío activo');
    expect(screen.getByTestId('feedback-info').className).toContain('lime-primary');
  });
});
