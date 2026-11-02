import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HowToPlay from './HowToPlay';

describe('HowToPlay', () => {
  it('renders the guide steps and game modes', () => {
    render(<HowToPlay onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Cómo jugar' })).toBeInTheDocument();
    expect(screen.getByText('1. Elegí o creá tu perfil')).toBeInTheDocument();
    expect(screen.getByText('4. Respondé la pregunta')).toBeInTheDocument();
    expect(screen.getByText('6 Coronas')).toBeInTheDocument();
    expect(screen.getByText('Duelo Definitivo')).toBeInTheDocument();
    expect(screen.getByText('Contrarreloj')).toBeInTheDocument();
  });

  it('closes with the close button, the acknowledgement button and Escape', () => {
    const onClose = vi.fn();
    render(<HowToPlay onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar guía' }));
    fireEvent.click(screen.getByRole('button', { name: '¡Entendido!' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
