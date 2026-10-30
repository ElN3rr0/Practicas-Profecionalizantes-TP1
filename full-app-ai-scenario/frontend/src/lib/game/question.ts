import type { Question } from '../api/types';

export const QUESTIONS_PER_ROUND = 4;

/** Wrong options the 50/50 comodín removes, leaving one correct and one wrong. */
export const ELIMINATED_BY_FIFTY_FIFTY = 2;

export type AnswerHint = {
  /** First character of the correct answer. */
  firstChar: string;
  /** Number of characters in the correct answer. */
  length: number;
};

export type QuestionRound = {
  statement: string;
  options: string[];
  correctIndex: number;
  hint: AnswerHint;
};

function isAnswerable(question: Question): boolean {
  return (
    typeof question.question === 'string' &&
    question.question.trim() !== '' &&
    typeof question.answer === 'string' &&
    question.answer.trim() !== ''
  );
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

/** Fisher–Yates shuffle over a copy, driven by an injectable random source. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(random() * (index + 1)));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Builds the four-option round from a category page: the first answerable question
 * supplies the statement and the correct option, and the next three distinct answers
 * become the distractors. Returns `null` when the page cannot yield four options.
 */
export function buildQuestionRound(
  questions: readonly Question[],
  random: () => number = Math.random,
): QuestionRound | null {
  // The category endpoint answers with an error object (not an array) when it has no
  // rows; treat any non-array as "no usable questions" instead of throwing.
  if (!Array.isArray(questions)) return null;
  const pool = questions.filter(isAnswerable);
  const [correct] = pool;
  if (correct === undefined) return null;

  const correctAnswer = correct.answer.trim();
  const distractors: string[] = [];
  for (const candidate of pool.slice(1)) {
    const answer = candidate.answer.trim();
    if (answer === correctAnswer || distractors.includes(answer)) continue;
    distractors.push(answer);
    if (distractors.length === QUESTIONS_PER_ROUND - 1) break;
  }
  if (distractors.length < QUESTIONS_PER_ROUND - 1) return null;

  const options = shuffle([correctAnswer, ...distractors], random);

  return {
    statement: correct.question.trim(),
    options,
    correctIndex: options.indexOf(correctAnswer),
    hint: {
      firstChar: codePoints(correctAnswer)[0] ?? '',
      length: codePoints(correctAnswer).length,
    },
  };
}

/** Two of the three wrong options, never the correct one — the 50/50 selection. */
export function eliminationIndexes(round: QuestionRound): number[] {
  return round.options
    .map((_, index) => index)
    .filter((index) => index !== round.correctIndex)
    .slice(0, ELIMINATED_BY_FIFTY_FIFTY);
}
