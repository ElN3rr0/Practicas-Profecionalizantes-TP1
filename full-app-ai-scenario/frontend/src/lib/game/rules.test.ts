import { describe, expect, it } from 'vitest';
import {
  CONTRARRELOJ_SECONDS,
  DUEL_CORRECT_ANSWERS,
  EXTRA_SECONDS,
  POINTS_PER_CORRECT_ANSWER,
  ROUNDS_PER_GAME,
  SERIES_TARGET_WINS,
  TALLY_TO_EARN_CROWN,
  crownWinner,
  duelWinner,
  holdsEveryCrown,
  isGameOver,
  roundWinner,
  seriesChampion,
  stateWinner,
  timeWinner,
  withCrown,
} from './rules';
import type { CategoryName, GameState } from './types';
import { patchPlayer, readyGame } from '../../test/gameState';

const SIX = ['arte', 'historia', 'deportes', 'entretenimiento', 'geografia', 'ciencia'] as const;

describe('rule constants', () => {
  it('pins the tunable values', () => {
    expect(POINTS_PER_CORRECT_ANSWER).toBe(100);
    expect(TALLY_TO_EARN_CROWN).toBe(3);
    expect(ROUNDS_PER_GAME).toBe(10);
    expect(EXTRA_SECONDS).toBe(15);
    expect(CONTRARRELOJ_SECONDS).toBe(90);
    expect(DUEL_CORRECT_ANSWERS).toBe(1);
    expect(SERIES_TARGET_WINS).toBe(2);
  });
});

describe('holdsEveryCrown', () => {
  it('is true only with all six canonical crowns', () => {
    const state = readyGame();
    expect(holdsEveryCrown(state.players[0])).toBe(false);
    expect(holdsEveryCrown(patchPlayer(state, 0, { crowns: [...SIX] }).players[0])).toBe(true);
    expect(
      holdsEveryCrown(patchPlayer(state, 0, { crowns: [...SIX].slice(0, 5) }).players[0]),
    ).toBe(false);
  });
});

describe('crownWinner', () => {
  it('returns the player holding all six crowns', () => {
    const state = patchPlayer(readyGame(), 1, { crowns: [...SIX] });
    expect(crownWinner(state.players)).toBe(1);
  });

  it('returns null while nobody holds every crown', () => {
    expect(crownWinner(readyGame().players)).toBeNull();
  });
});

describe('roundWinner', () => {
  it('credits the player with more round points', () => {
    expect(roundWinner([100, 0])).toBe(0);
    expect(roundWinner([0, 100])).toBe(1);
  });

  it('credits nobody on a tied round', () => {
    expect(roundWinner([100, 100])).toBeNull();
    expect(roundWinner([0, 0])).toBeNull();
  });
});

describe('duelWinner', () => {
  it('returns the first player with a correct answer', () => {
    const state = patchPlayer(readyGame({ mode: 'duelo' }), 1, { correctAnswers: 1 });
    expect(duelWinner(state.players)).toBe(1);
    expect(duelWinner(readyGame().players)).toBeNull();
  });
});

describe('timeWinner', () => {
  it('returns the higher score and null on a tie', () => {
    const base = readyGame({ mode: 'contrarreloj' });
    expect(timeWinner(patchPlayer(base, 0, { score: 300 }).players)).toBe(0);
    expect(timeWinner(patchPlayer(base, 1, { score: 300 }).players)).toBe(1);
    expect(timeWinner(base.players)).toBeNull();
  });
});

describe('seriesChampion', () => {
  it('declares the first player to reach the target wins', () => {
    expect(seriesChampion([0, 0])).toBeNull();
    expect(seriesChampion([1, 1])).toBeNull();
    expect(seriesChampion([2, 1])).toBe(0);
    expect(seriesChampion([1, 2])).toBe(1);
  });
});

describe('isGameOver', () => {
  it('is driven by the crowns in coronas mode', () => {
    expect(isGameOver(readyGame())).toBe(false);
    expect(isGameOver(patchPlayer(readyGame(), 0, { crowns: [...SIX] }))).toBe(true);
  });

  it('ends a duel as soon as someone answers correctly', () => {
    const duel = readyGame({ mode: 'duelo' });
    expect(isGameOver(duel)).toBe(false);
    expect(isGameOver(patchPlayer(duel, 0, { correctAnswers: 1 }))).toBe(true);
  });

  it('ends a contrarreloj game exactly at zero', () => {
    expect(isGameOver({ ...readyGame({ mode: 'contrarreloj' }), clock: 1 })).toBe(false);
    expect(isGameOver({ ...readyGame({ mode: 'contrarreloj' }), clock: 0 })).toBe(true);
  });

  it('ends a rondas game only after the tenth round with a decided round count', () => {
    const atTen: GameState = { ...readyGame({ mode: 'rondas' }), round: 10, roundWins: [6, 4] };
    expect(isGameOver(atTen)).toBe(false);
    expect(isGameOver({ ...atTen, round: 11, roundWins: [6, 4] })).toBe(true);
    expect(isGameOver({ ...atTen, round: 11, roundWins: [4, 6] })).toBe(true);
  });

  it('keeps playing a tied rondas game with no round cap', () => {
    const tied: GameState = { ...readyGame({ mode: 'rondas' }), round: 11, roundWins: [5, 5] };
    expect(isGameOver(tied)).toBe(false);
    expect(isGameOver({ ...tied, round: 14 })).toBe(false);
    expect(isGameOver({ ...tied, round: 14, roundWins: [7, 7] })).toBe(false);
  });
});

describe('stateWinner', () => {
  it('names the crown holder in coronas mode', () => {
    expect(stateWinner(patchPlayer(readyGame(), 0, { crowns: [...SIX] }))).toBe(0);
  });

  it('names the first correct answer in duelo mode', () => {
    expect(stateWinner(patchPlayer(readyGame({ mode: 'duelo' }), 1, { correctAnswers: 1 }))).toBe(
      1,
    );
  });

  it('names the score leader in contrarreloj mode', () => {
    const state = patchPlayer(readyGame({ mode: 'contrarreloj' }), 0, { score: 200 });
    expect(stateWinner(state)).toBe(0);
  });

  it('names the round-wins leader in rondas mode, or null on a tie', () => {
    const ended: GameState = { ...readyGame({ mode: 'rondas' }), round: 11, roundWins: [4, 3] };
    expect(stateWinner(ended)).toBe(0);
    expect(stateWinner({ ...ended, roundWins: [3, 3] })).toBeNull();
  });
});

describe('withCrown', () => {
  it('adds a crown once and keeps the original array untouched', () => {
    const crowns: CategoryName[] = ['arte'];
    const next = withCrown(crowns, 'ciencia');

    expect(next).toEqual(['arte', 'ciencia']);
    expect(crowns).toEqual(['arte']);
    expect(withCrown(next, 'ciencia')).toEqual(['arte', 'ciencia']);
  });
});
