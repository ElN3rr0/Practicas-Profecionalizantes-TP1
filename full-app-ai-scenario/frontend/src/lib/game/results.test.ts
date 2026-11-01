import { describe, expect, it } from 'vitest';
import { createInitialState } from './GameProvider';
import { modeAchievement, resolveWinner } from './results';
import { WHEEL_CATEGORIES } from './spin';
import { finishedGame } from '../../test/gameState';
import type { CategoryName } from './types';

const EVERY_CROWN: CategoryName[] = [...WHEEL_CATEGORIES];

describe('resolveWinner / coronas', () => {
  it('declares the player holding every crown', () => {
    const state = finishedGame({ crowns: [[], EVERY_CROWN], winner: 1 });

    expect(resolveWinner(state)).toBe(1);
  });

  it('declares player 0 when player 0 holds every crown', () => {
    const state = finishedGame({ crowns: [EVERY_CROWN, []], winner: 0 });

    expect(resolveWinner(state)).toBe(0);
  });

  it('declares no winner while a crown is still missing', () => {
    const state = finishedGame({ crowns: [EVERY_CROWN.slice(0, 5), []], winner: 0 });

    expect(resolveWinner(state)).toBeNull();
  });
});

describe('resolveWinner / rondas', () => {
  it('declares the player with more round-wins', () => {
    expect(resolveWinner(finishedGame({ mode: 'rondas', roundWins: [6, 4], winner: 0 }))).toBe(0);
    expect(resolveWinner(finishedGame({ mode: 'rondas', roundWins: [4, 6], winner: 1 }))).toBe(1);
  });

  it('declares the sudden-death winner, never the higher total score', () => {
    const playerZeroWonSuddenDeath = finishedGame({
      mode: 'rondas',
      roundWins: [6, 5],
      winner: 0,
      scores: [400, 900],
    });

    expect(resolveWinner(playerZeroWonSuddenDeath)).toBe(0);
  });

  it('falls back to Jugador 1 on a tied round count, which the game cannot end on', () => {
    const unreachable = finishedGame({
      mode: 'rondas',
      roundWins: [5, 5],
      winner: null,
      scores: [400, 900],
    });

    expect(resolveWinner(unreachable)).toBe(0);
  });
});

describe('resolveWinner / duelo and contrarreloj', () => {
  it('declares the first player with a correct answer in duelo', () => {
    const base = finishedGame({ mode: 'duelo', winner: 1, status: 'ended' });
    const state = {
      ...base,
      players: [base.players[0], { ...base.players[1], correctAnswers: 1 }] as typeof base.players,
    };

    expect(resolveWinner(state)).toBe(1);
  });

  it('declares the score leader in contrarreloj', () => {
    const state = finishedGame({
      mode: 'contrarreloj',
      winner: 0,
      status: 'ended',
      scores: [400, 300],
    });

    expect(resolveWinner(state)).toBe(0);
  });

  it('declares no winner in contrarreloj on a tie', () => {
    const state = finishedGame({
      mode: 'contrarreloj',
      winner: null,
      status: 'ended',
      scores: [300, 300],
    });

    expect(resolveWinner(state)).toBeNull();
  });

  it('gives the win to the rival when a player retires', () => {
    expect(resolveWinner(finishedGame({ retiredBy: 0, winner: 1 }))).toBe(1);
    expect(resolveWinner(finishedGame({ retiredBy: 1, winner: 0 }))).toBe(0);
  });
});

describe('resolveWinner / unfinished game', () => {
  it('declares no winner before the game ends, even with every crown held', () => {
    const state = finishedGame({
      crowns: [EVERY_CROWN, []],
      status: 'answering',
      winner: null,
    });

    expect(resolveWinner(state)).toBeNull();
  });

  it('declares no winner before the game ends, even with decisive round-wins', () => {
    const state = finishedGame({ mode: 'rondas', roundWins: [9, 0], status: 'spinning' });

    expect(resolveWinner(state)).toBeNull();
  });
});

describe('modeAchievement', () => {
  const players = createInitialState().players;

  it('counts the crowns a player holds in coronas mode', () => {
    const player = { ...players[0], crowns: ['arte', 'ciencia'] as CategoryName[] };

    expect(modeAchievement(player, 'coronas', 0)).toBe('2 de 6 coronas');
  });

  it('counts the rounds a player won in rondas mode', () => {
    expect(modeAchievement(players[1], 'rondas', 7)).toBe('7 rondas ganadas');
  });

  it('reports more than ten rounds won without claiming a ten-round total', () => {
    expect(modeAchievement(players[0], 'rondas', 11)).toBe('11 rondas ganadas');
  });

  it('describes the duel and contrarreloj outcomes', () => {
    expect(modeAchievement(players[0], 'duelo', 0)).toBe('Primer acierto');
    expect(modeAchievement({ ...players[0], score: 400 }, 'contrarreloj', 0)).toBe('400 puntos');
  });
});
