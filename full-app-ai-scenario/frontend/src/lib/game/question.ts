import type { Question } from '../api/types';

export const QUESTIONS_PER_ROUND = 4;

/** Questions fetched per request so the round can be drawn from a wide pool. */
export const QUESTIONS_POOL_SIZE = 40;

/** Wrong options the 50/50 comodín removes, leaving one correct and one wrong. */
export const ELIMINATED_BY_FIFTY_FIFTY = 2;

export type AnswerHint = {
  /** First character of the correct answer. */
  firstChar: string;
  /** Number of characters in the correct answer. */
  length: number;
};

export type QuestionRound = {
  /** Dataset id of the question being asked. */
  id: string;
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
 * Builds the four-option round from a category page. A randomly picked answerable
 * question supplies the statement and the correct option; the remaining questions in
 * the same category supply three distinct wrong answers. `excludeStatement` keeps the
 * previous question out when the player spends "Pasa la pregunta", and `usedIds` avoids
 * repeating questions within one game while the category still has unused ones.
 *
 * When `category` is provided, rows explicitly labeled with a different category are
 * discarded, so a mixed API response can never leak an answer from another category.
 * Returns `null` when the page cannot yield four options.
 */
export function buildQuestionRound(
  questions: readonly Question[],
  random: () => number = Math.random,
  excludeStatement?: string,
  category?: string,
  usedIds: ReadonlySet<string> = new Set(),
): QuestionRound | null {
  // The category endpoint answers with an error object (not an array) when it has no
  // rows; treat any non-array as "no usable questions" instead of throwing.
  if (!Array.isArray(questions)) return null;

  let pool = questions.filter(isAnswerable);
  if (category !== undefined) {
    pool = pool.filter(
      (question) => question.category_name === undefined || question.category_name === category,
    );
  }

  // The correct question must be fresh; distractors may reuse already-seen questions
  // because only their answers matter and the category is already guaranteed.
  let candidates = pool;
  if (excludeStatement !== undefined) {
    const withoutExcluded = candidates.filter(
      (question) => question.question.trim() !== excludeStatement.trim(),
    );
    if (withoutExcluded.length > 0) candidates = withoutExcluded;
  }
  if (usedIds.size > 0) {
    const unused = candidates.filter((question) => !usedIds.has(String(question.id)));
    if (unused.length > 0) candidates = unused;
  }

  const [correct] = shuffle(candidates, random);
  if (correct === undefined) return null;

  const correctAnswer = correct.answer.trim();
  const distractors: string[] = [];
  for (const candidate of shuffle(pool, random)) {
    const answer = candidate.answer.trim();
    if (answer === correctAnswer || distractors.includes(answer)) continue;
    distractors.push(answer);
    if (distractors.length === QUESTIONS_PER_ROUND - 1) break;
  }
  if (distractors.length < QUESTIONS_PER_ROUND - 1) return null;

  const options = shuffle([correctAnswer, ...distractors], random);

  return {
    id: String(correct.id),
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
