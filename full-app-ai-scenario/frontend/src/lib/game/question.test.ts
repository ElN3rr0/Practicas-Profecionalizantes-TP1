import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../api/types';
import { QUESTIONS_PER_ROUND, buildQuestionRound, eliminationIndexes, shuffle } from './question';

function question(id: number, text: string, answer: string): Question {
  return { id, question: text, answer, category_name: 'arte' };
}

const PAGE: Question[] = [
  question(1, '¿Quién pintó la Gioconda?', 'Leonardo da Vinci'),
  question(2, '¿En qué museo vive la Gioconda?', 'El Louvre'),
  question(3, '¿Quién pintó el Guernica?', 'Picasso'),
  question(4, '¿Quién pintó La noche estrellada?', 'Van Gogh'),
  question(5, '¿Quién esculpió el David?', 'Miguel Ángel'),
];

function alwaysLast(): number {
  return 0.999;
}

describe('shuffle', () => {
  it('keeps every element and leaves the source untouched', () => {
    const source = [1, 2, 3, 4];
    const shuffled = shuffle(source, alwaysLast);

    expect(shuffled).toEqual([1, 2, 3, 4]);
    expect(source).toEqual([1, 2, 3, 4]);
    expect(shuffle(source, alwaysLast)).not.toBe(source);
  });

  it('reorders when the random source pulls every element to the front', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});

describe('buildQuestionRound', () => {
  it('returns four options with exactly one correct answer', () => {
    const round = buildQuestionRound(PAGE, alwaysLast);

    expect(round).not.toBeNull();
    expect(round?.id).toBe('1');
    expect(round?.options).toHaveLength(QUESTIONS_PER_ROUND);
    expect(round?.statement).toBe('¿Quién pintó la Gioconda?');
    expect(round?.options[round.correctIndex]).toBe('Leonardo da Vinci');
    expect(round?.options.filter((option) => option === 'Leonardo da Vinci')).toHaveLength(1);
    expect(new Set(round?.options).size).toBe(QUESTIONS_PER_ROUND);
  });

  it('keeps exactly one correct option whatever the shuffle produces', () => {
    const round = buildQuestionRound(PAGE, () => 0);

    expect(round).not.toBeNull();
    expect(round?.statement).toBe('¿En qué museo vive la Gioconda?');
    expect(round?.options[round?.correctIndex ?? -1]).toBe('El Louvre');
    expect(round?.options.filter((option) => option === 'El Louvre')).toHaveLength(1);
  });

  it('tracks the correct index after the shuffle', () => {
    const round = buildQuestionRound(PAGE, () => 0.5);

    expect(round).not.toBeNull();
    const correctIndex = round?.correctIndex ?? -1;
    expect(correctIndex).toBeGreaterThanOrEqual(0);
    expect(round?.options[correctIndex]).toBe('Leonardo da Vinci');
  });

  it('can pick any question from the page, not always the first', () => {
    const first = buildQuestionRound(PAGE, alwaysLast);
    const later = buildQuestionRound(PAGE, () => 0);

    expect(first?.statement).toBe('¿Quién pintó la Gioconda?');
    expect(later?.statement).toBe('¿En qué museo vive la Gioconda?');
  });

  it('excludes the previous question when the pool is large enough', () => {
    const round = buildQuestionRound(PAGE, alwaysLast, '¿Quién pintó la Gioconda?');

    expect(round?.statement).not.toBe('¿Quién pintó la Gioconda?');
    expect(round?.statement).toBe('¿En qué museo vive la Gioconda?');
  });

  it('skips the excluded question even when the page has exactly four questions', () => {
    const round = buildQuestionRound(PAGE.slice(0, 4), alwaysLast, '¿Quién pintó la Gioconda?');

    expect(round?.statement).not.toBe('¿Quién pintó la Gioconda?');
    expect(round?.statement).toBe('¿En qué museo vive la Gioconda?');
    expect(round?.options).toHaveLength(4);
  });

  it('drops questions explicitly labeled with another category', () => {
    const mixed: Question[] = [
      ...PAGE.map((item) => ({ ...item, category_name: 'arte' })),
      {
        ...question(9, '¿Pregunta de historia?', 'Respuesta de Historia'),
        category_name: 'historia',
      },
    ];

    const round = buildQuestionRound(mixed, alwaysLast, undefined, 'arte');

    expect(round?.statement).toBe('¿Quién pintó la Gioconda?');
    expect(round?.options).not.toContain('Respuesta de Historia');
  });

  it('avoids used questions while unused ones remain', () => {
    const round = buildQuestionRound(PAGE, alwaysLast, undefined, undefined, new Set(['1', '2']));

    expect(round?.statement).toBe('¿Quién pintó el Guernica?');
    expect(round?.id).toBe('3');
  });

  it('allows a repeat when every question was already used', () => {
    const everyId = new Set(PAGE.map((item) => String(item.id)));
    const round = buildQuestionRound(PAGE, alwaysLast, undefined, undefined, everyId);

    expect(round?.statement).toBe('¿Quién pintó la Gioconda?');
  });

  it('uses only the answers of the other questions as distractors', () => {
    const round = buildQuestionRound(PAGE, alwaysLast);

    expect(round?.options).toEqual(['Leonardo da Vinci', 'El Louvre', 'Picasso', 'Van Gogh']);
  });

  it('returns null when the page has fewer than four usable questions', () => {
    expect(buildQuestionRound([], alwaysLast)).toBeNull();
    expect(buildQuestionRound(PAGE.slice(0, 3), alwaysLast)).toBeNull();
  });

  it('skips blank questions and blank answers', () => {
    const noisy: Question[] = [
      question(0, '', 'vacía'),
      question(0, '   ', 'vacía'),
      question(0, 'sin respuesta', '   '),
      ...PAGE,
    ];

    const round = buildQuestionRound(noisy, alwaysLast);

    expect(round?.statement).toBe('¿Quién pintó la Gioconda?');
    expect(round?.options).toHaveLength(QUESTIONS_PER_ROUND);
  });

  it('drops repeated and self-repeating answers so the correct option stays unique', () => {
    const duplicated: Question[] = [
      question(1, '¿Quién pintó la Gioconda?', 'Leonardo da Vinci'),
      question(2, 'Otra', 'Leonardo da Vinci'),
      question(3, 'Otra más', 'El Louvre'),
      question(4, 'Y otra', 'El Louvre'),
      question(5, 'Última', 'Picasso'),
      question(6, 'Extra', 'Van Gogh'),
    ];

    const round = buildQuestionRound(duplicated, alwaysLast);

    expect(round?.options).toEqual(['Leonardo da Vinci', 'El Louvre', 'Picasso', 'Van Gogh']);
    expect(round?.options.filter((option) => option === 'Leonardo da Vinci')).toHaveLength(1);
  });

  it('reports insufficient when repeated answers leave fewer than three distractors', () => {
    const duplicated = [
      question(1, 'Uno', 'Misma'),
      question(2, 'Dos', 'Misma'),
      question(3, 'Tres', 'Misma'),
      question(4, 'Cuatro', 'Misma'),
    ];

    expect(buildQuestionRound(duplicated, alwaysLast)).toBeNull();
  });

  it('builds the hint from the correct answer', () => {
    const round = buildQuestionRound(PAGE, alwaysLast);

    expect(round?.hint).toEqual({ firstChar: 'L', length: 'Leonardo da Vinci'.length });
  });

  it('reveals the first character and length as-is for non-alphabetic answers', () => {
    const numeric = [
      question(1, '¿En qué año?', '1810'),
      question(2, 'Otra', '1816'),
      question(3, 'Otra más', '1853'),
      question(4, 'Última', '1900'),
    ];

    const round = buildQuestionRound(numeric, alwaysLast);

    expect(round?.hint).toEqual({ firstChar: '1', length: 4 });
  });

  it('counts characters by code point and trims surrounding spaces', () => {
    const accented = [
      question(1, '¿Capital?', '  Ámsterdam  '),
      question(2, 'Otra', 'Bruselas'),
      question(3, 'Otra más', 'Lisboa'),
      question(4, 'Última', 'Madrid'),
    ];

    const round = buildQuestionRound(accented, alwaysLast);

    expect(round?.hint).toEqual({ firstChar: 'Á', length: 9 });
  });

  it('uses Math.random by default', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const round = buildQuestionRound(PAGE);

    expect(round?.options[round.correctIndex]).toBe('Leonardo da Vinci');
    expect(randomSpy).toHaveBeenCalled();
    randomSpy.mockRestore();
  });
});

describe('eliminationIndexes', () => {
  it('returns two wrong indexes and never the correct one', () => {
    const round = buildQuestionRound(PAGE, alwaysLast);

    expect(round).not.toBeNull();
    if (round === null) return;

    const removed = eliminationIndexes(round);

    expect(removed).toHaveLength(2);
    expect(removed).not.toContain(round.correctIndex);
    expect(round.options.filter((_, index) => !removed.includes(index))).toHaveLength(2);
  });
});
