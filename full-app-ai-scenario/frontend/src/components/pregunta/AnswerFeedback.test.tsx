import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnswerFeedback from './AnswerFeedback';

describe('AnswerFeedback', () => {
  it('celebrates a correct answer without a right-answer line', () => {
    render(
      <AnswerFeedback
        kind="correct"
        detail="¡Bien ahí! Sumaste 100 puntos."
        continueLabel="Continuar"
        onContinue={() => {}}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Resultado de la respuesta' })).toBeInTheDocument();
    expect(screen.getByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.queryByTestId('feedback-correct-answer')).not.toBeInTheDocument();
  });

  it('shows the correct answer on a wrong answer and continues', () => {
    const onContinue = vi.fn();
    render(
      <AnswerFeedback
        kind="incorrect"
        correctAnswer="El Louvre"
        detail="No sumaste puntos esta vez."
        continueLabel="Continuar"
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Incorrecto')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-correct-answer')).toHaveTextContent('El Louvre');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows the timeout state with the correct answer', () => {
    render(
      <AnswerFeedback
        kind="timeout"
        correctAnswer="París"
        detail="No respondiste a tiempo."
        continueLabel="Continuar"
        onContinue={() => {}}
      />,
    );

    expect(screen.getByText('Se acabó el tiempo')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-correct-answer')).toHaveTextContent('París');
  });

  it('uses the provided continue label', () => {
    render(
      <AnswerFeedback
        kind="correct"
        detail="ok"
        continueLabel="Ver resultados"
        onContinue={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ver resultados' })).toBeInTheDocument();
  });
});
