import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  GameProvider,
  gameReducer,
  resolveAnswer,
  resolveCrownPick,
  resolveGameEnd,
  resolvePowerup,
  resolveUltraAnswer,
  resolveUltraStart,
  useGame,
} from './GameProvider';
import type { Step } from './GameProvider';
import type { AnswerOutcome, GameState } from './types';
import { patchPlayer, readyGame, withPowerups } from '../../test/gameState';

const SIX_CROWNS = [
  'arte',
  'historia',
  'deportes',
  'entretenimiento',
  'geografia',
  'ciencia',
] as const;

function retryReady(): GameState {
  return withPowerups(readyGame({ powerups: ['second-chance'] }), 0, { 'second-chance': 1 });
}

function rondas(overrides: Partial<GameState> = {}): GameState {
  return { ...readyGame({ mode: 'rondas' }), ...overrides };
}

/** Plays one full round of "10 rondas": player 0 answers, then player 1. */
function playRound(state: GameState, first: boolean, second: boolean): Step<AnswerOutcome> {
  const afterFirst = resolveAnswer({ ...state, currentTurn: 0 }, first);
  return resolveAnswer({ ...afterFirst.state, currentTurn: 1 }, second);
}

describe('resolveAnswer — scoring', () => {
  it('awards the answering player only', () => {
    const step = resolveAnswer(readyGame(), true);

    expect(step.value).toBe('continue');
    expect(step.state.players[0].score).toBe(100);
    expect(step.state.players[1].score).toBe(0);
    expect(step.state.players[0].crownTally).toBe(1);
    expect(step.state.players[1].crownTally).toBe(0);
    expect(step.state.currentTurn).toBe(1);
  });

  it('awards nothing on a wrong answer', () => {
    const step = resolveAnswer(readyGame(), false);

    expect(step.value).toBe('continue');
    expect(step.state.players[0].score).toBe(0);
    expect(step.state.players[1].score).toBe(0);
    expect(step.state.players[0].crownTally).toBe(0);
    expect(step.state.players[1].crownTally).toBe(0);
    expect(step.state.currentTurn).toBe(1);
  });

  it('does not touch the waiting player when the second player answers', () => {
    const step = resolveAnswer(readyGame({}, 1), true);

    expect(step.state.players[1].score).toBe(100);
    expect(step.state.players[0].score).toBe(0);
    expect(step.state.players[0].crownTally).toBe(0);
    expect(step.state.currentTurn).toBe(0);
  });
});

describe('resolveAnswer — crown progress', () => {
  it('keeps accumulated progress on a wrong answer', () => {
    const step = resolveAnswer(patchPlayer(readyGame(), 0, { crownTally: 2 }), false);

    expect(step.state.players[0].crownTally).toBe(2);
    expect(step.value).toBe('continue');
  });

  it('keeps accumulated progress through a 2da Chance retry', () => {
    const state = withPowerups(patchPlayer(retryReady(), 0, { crownTally: 2 }), 0, {
      'second-chance': 1,
    });

    const retried = resolveAnswer(state, false);
    const closed = resolveAnswer(retried.state, false);

    expect(retried.state.players[0].crownTally).toBe(2);
    expect(closed.state.players[0].crownTally).toBe(2);
  });

  it('increments the tally on every correct answer', () => {
    const first = resolveAnswer(readyGame(), true);
    const second = resolveAnswer({ ...first.state, currentTurn: 0 }, true);

    expect(second.state.players[0].crownTally).toBe(2);
    expect(second.state.players[0].score).toBe(200);
  });
});

describe('resolveAnswer — turn flips exactly once', () => {
  it('flips 0 → 1 and 1 → 0', () => {
    expect(resolveAnswer(readyGame({}, 0), true).state.currentTurn).toBe(1);
    expect(resolveAnswer(readyGame({}, 1), true).state.currentTurn).toBe(0);
    expect(resolveAnswer(readyGame({}, 0), false).state.currentTurn).toBe(1);
    expect(resolveAnswer(readyGame({}, 1), false).state.currentTurn).toBe(0);
  });
});

describe('resolveAnswer — guards', () => {
  it('is a no-op once the game ended', () => {
    const ended: GameState = { ...readyGame(), status: 'ended', winner: 0 };
    const step = resolveAnswer(ended, true);

    expect(step.value).toBe('none');
    expect(step.state).toBe(ended);
  });

  it('refuses a second confirmation while a crown is owed', () => {
    const awaiting = patchPlayer(readyGame(), 0, { crownTally: 2 });
    const step = resolveAnswer(awaiting, true);
    const again = resolveAnswer(step.state, true);

    expect(step.value).toBe('crown-pick');
    expect(again.value).toBe('crown-pick');
    expect(again.state.players[0].score).toBe(100);
    expect(again.state.currentTurn).toBe(0);
  });
});

describe('2da Chance', () => {
  it('re-presents the question, spends one use and keeps the turn', () => {
    const step = resolveAnswer(retryReady(), false);

    expect(step.value).toBe('retry');
    expect(step.state.players[0].powerups['second-chance']).toBe(0);
    expect(step.state.players[0].score).toBe(0);
    expect(step.state.players[0].crownTally).toBe(0);
    expect(step.state.currentTurn).toBe(0);
    expect(step.state.retryUsed).toBe(true);
  });

  it('allows exactly one retry: the next wrong answer closes the question', () => {
    const retried = resolveAnswer(retryReady(), false);
    const closed = resolveAnswer(retried.state, false);

    expect(closed.value).toBe('continue');
    expect(closed.state.currentTurn).toBe(1);
    expect(closed.state.players[0].powerups['second-chance']).toBe(0);
    expect(closed.state.retryUsed).toBe(false);
  });

  it('still scores a correct retry', () => {
    const retried = resolveAnswer(retryReady(), false);
    const correct = resolveAnswer(retried.state, true);

    expect(correct.state.players[0].score).toBe(100);
    expect(correct.state.currentTurn).toBe(1);
  });

  it('does not fire on a timeout', () => {
    const step = resolveAnswer(retryReady(), false, false);

    expect(step.value).toBe('continue');
    expect(step.state.players[0].powerups['second-chance']).toBe(1);
    expect(step.state.currentTurn).toBe(1);
  });

  it('does not fire when the game did not enable it', () => {
    const state = withPowerups(readyGame(), 0, { 'second-chance': 1 });
    const step = resolveAnswer(state, false);

    expect(step.value).toBe('continue');
    expect(step.state.players[0].powerups['second-chance']).toBe(1);
    expect(step.state.currentTurn).toBe(1);
  });
});

describe('crown pick', () => {
  it('awards the chosen crown and closes the question', () => {
    const awaiting = resolveAnswer(patchPlayer(readyGame(), 0, { crownTally: 2 }), true);
    const picked = resolveCrownPick(awaiting.state, 'ciencia');

    expect(picked.value).toBe('continue');
    expect(picked.state.players[0].crowns).toEqual(['ciencia']);
    expect(picked.state.players[0].crownTally).toBe(0);
    expect(picked.state.awaitingCrown).toBe(false);
    expect(picked.state.currentTurn).toBe(1);
  });

  it('refuses a crown the player already holds', () => {
    const state = {
      ...patchPlayer(readyGame(), 0, { crownTally: 3, crowns: ['arte'] }),
      awaitingCrown: true,
    };
    const picked = resolveCrownPick(state, 'arte');

    expect(picked.value).toBe('crown-pick');
    expect(picked.state).toBe(state);
    expect(picked.state.currentTurn).toBe(0);
  });

  it('is a no-op when no crown is owed', () => {
    const state = readyGame();
    const picked = resolveCrownPick(state, 'arte');

    expect(picked.value).toBe('none');
    expect(picked.state).toBe(state);
  });
});

describe('ultra desafío', () => {
  it('opens once per turn with the chosen category', () => {
    const state = readyGame();
    const started = resolveUltraStart(state, 'historia');
    const again = resolveUltraStart(started.state, 'ciencia');

    expect(started.value).toBe(true);
    expect(started.state.ultraChallenge).toBe('historia');
    expect(started.state.ultraUsed).toBe(true);
    expect(again.value).toBe(false);
    expect(again.state.ultraChallenge).toBe('historia');
  });

  it('stays spent for the turn across a re-land from the wheel', () => {
    const started = resolveUltraStart(readyGame(), 'historia');
    const won = resolveUltraAnswer(started.state, true);
    const landedAgain = gameReducer(won.state, { type: 'game/land', category: 'arte' });
    const second = resolveUltraStart(landedAgain, 'ciencia');

    expect(won.state.currentTurn).toBe(0);
    expect(landedAgain.currentTurn).toBe(0);
    expect(second.value).toBe(false);
    expect(second.state.ultraChallenge).toBeNull();
    expect(second.state.currentTurn).toBe(0);
  });

  it('cannot start while a crown is owed or the game ended', () => {
    const awaiting: GameState = { ...readyGame(), awaitingCrown: true };
    const ended: GameState = { ...readyGame(), status: 'ended', winner: 0 };

    expect(resolveUltraStart(awaiting, 'arte').value).toBe(false);
    expect(resolveUltraStart(ended, 'arte').value).toBe(false);
  });

  it('grants the chosen crown on a win without scoring or passing the turn', () => {
    const started = resolveUltraStart(readyGame(), 'historia');
    const won = resolveUltraAnswer(started.state, true);

    expect(won.value).toBe('continue');
    expect(won.state.players[0].crowns).toEqual(['historia']);
    expect(won.state.players[0].score).toBe(0);
    expect(won.state.players[0].crownTally).toBe(0);
    expect(won.state.currentTurn).toBe(0);
    expect(won.state.ultraChallenge).toBeNull();
  });

  it('resets the tally on a loss', () => {
    const started = resolveUltraStart(patchPlayer(readyGame(), 0, { crownTally: 2 }), 'historia');
    const lost = resolveUltraAnswer(started.state, false);

    expect(lost.value).toBe('continue');
    expect(lost.state.players[0].crownTally).toBe(0);
    expect(lost.state.players[0].crowns).toEqual([]);
    expect(lost.state.currentTurn).toBe(0);
    expect(lost.state.ultraChallenge).toBeNull();
  });

  it('offers the 2da Chance retry on the ultra question', () => {
    const withCharge = withPowerups(
      patchPlayer(readyGame({ powerups: ['second-chance'] }), 0, { crownTally: 1 }),
      0,
      { 'second-chance': 1 },
    );
    const started = resolveUltraStart(withCharge, 'ciencia');
    const retried = resolveUltraAnswer(started.state, false);
    const lost = resolveUltraAnswer(retried.state, false);

    expect(retried.value).toBe('retry');
    expect(retried.state.ultraChallenge).toBe('ciencia');
    expect(retried.state.players[0].powerups['second-chance']).toBe(0);
    expect(retried.state.players[0].crownTally).toBe(1);
    expect(lost.value).toBe('continue');
    expect(lost.state.players[0].crownTally).toBe(0);
    expect(lost.state.ultraChallenge).toBeNull();
  });

  it('ends the game when the ultra win completes the six crowns', () => {
    const five = patchPlayer(readyGame(), 0, { crowns: [...SIX_CROWNS].slice(0, 5) });
    const started = resolveUltraStart(five, 'ciencia');
    const won = resolveUltraAnswer(started.state, true);

    expect(won.value).toBe('ended');
    expect(won.state.status).toBe('ended');
    expect(won.state.winner).toBe(0);
  });

  it('is a no-op when no ultra challenge is active', () => {
    const state = readyGame();
    const resolved = resolveUltraAnswer(state, true);

    expect(resolved.value).toBe('none');
    expect(resolved.state).toBe(state);
  });
});

describe('powerups', () => {
  it('spends one use and then refuses', () => {
    const state = readyGame({ powerups: ['fifty-fifty'] });
    const first = resolvePowerup(state, 'fifty-fifty');
    const second = resolvePowerup(first.state, 'fifty-fifty');

    expect(first.value).toBe(true);
    expect(first.state.players[0].powerups['fifty-fifty']).toBe(0);
    expect(second.value).toBe(false);
    expect(second.state.players[0].powerups['fifty-fifty']).toBe(0);
  });

  it('refuses a powerup the game did not enable', () => {
    const state = withPowerups(readyGame(), 0, { 'plus-time': 1 });
    const step = resolvePowerup(state, 'plus-time');

    expect(step.value).toBe(false);
    expect(step.state.players[0].powerups['plus-time']).toBe(1);
  });

  it('only spends the current player inventory', () => {
    const state = readyGame({ powerups: ['hint'] });
    const step = resolvePowerup(state, 'hint');

    expect(step.state.players[0].powerups.hint).toBe(0);
    expect(step.state.players[1].powerups.hint).toBe(1);
  });

  it('never fires the reactive 2da Chance manually', () => {
    const state = readyGame({ powerups: ['second-chance'] });
    const step = resolvePowerup(state, 'second-chance');

    expect(step.value).toBe(false);
    expect(step.state.players[0].powerups['second-chance']).toBe(1);
  });

  it('clears the spent retry when the question is skipped', () => {
    const retried = resolveAnswer(retryReady(), false);
    const withSkip = withPowerups(
      {
        ...retried.state,
        config: { ...retried.state.config, powerups: ['skip-question'] },
      },
      0,
      { 'skip-question': 1 },
    );
    const skipped = resolvePowerup(withSkip, 'skip-question');

    expect(skipped.value).toBe(true);
    expect(skipped.state.retryUsed).toBe(false);
  });

  it('is a no-op once the game ended', () => {
    const ended: GameState = {
      ...readyGame({ powerups: ['hint'] }),
      status: 'ended',
      winner: 0,
    };

    expect(resolvePowerup(ended, 'hint').value).toBe(false);
  });

  it('spends each activatable powerup exactly once', () => {
    const state = readyGame({
      powerups: ['fifty-fifty', 'plus-time', 'skip-question', 'hint'],
    });

    const afterFifty = resolvePowerup(state, 'fifty-fifty');
    const afterTime = resolvePowerup(afterFifty.state, 'plus-time');
    const afterSkip = resolvePowerup(afterTime.state, 'skip-question');
    const afterHint = resolvePowerup(afterSkip.state, 'hint');

    expect(afterHint.value).toBe(true);
    expect(afterHint.state.players[0].powerups).toEqual({
      'fifty-fifty': 0,
      'second-chance': 0,
      'plus-time': 0,
      'skip-question': 0,
      hint: 0,
    });
  });
});

describe('round tracking (rondas mode)', () => {
  it('credits the higher scorer when both players have answered', () => {
    const first = resolveAnswer(rondas(), true);
    expect(first.state.roundAnswers).toEqual([1, 0]);
    expect(first.state.roundPoints).toEqual([100, 0]);
    expect(first.state.round).toBe(1);

    const second = resolveAnswer(first.state, false);
    expect(second.state.roundWins).toEqual([1, 0]);
    expect(second.state.round).toBe(2);
    expect(second.state.roundAnswers).toEqual([0, 0]);
    expect(second.state.roundPoints).toEqual([0, 0]);
  });

  it('credits nobody on a tied round', () => {
    const first = resolveAnswer(rondas(), false);
    const second = resolveAnswer(first.state, false);

    expect(second.state.roundWins).toEqual([0, 0]);
    expect(second.state.round).toBe(2);
  });

  it('credits player 1 when player 1 scores the round', () => {
    const first = resolveAnswer(rondas(), false);
    const second = resolveAnswer({ ...first.state, currentTurn: 1 }, true);

    expect(second.state.roundWins).toEqual([0, 1]);
    expect(second.state.round).toBe(2);
  });

  it('does not advance the boundary on a 2da Chance retry', () => {
    const base = retryReady();
    const state = { ...base, config: { ...base.config, mode: 'rondas' as const } };
    const retried = resolveAnswer(state, false);

    expect(retried.state.roundAnswers).toEqual([0, 0]);
    expect(retried.state.round).toBe(1);

    const closed = resolveAnswer(retried.state, false);
    expect(closed.state.roundAnswers).toEqual([1, 0]);
    expect(closed.state.round).toBe(1);
  });

  it('leaves the round bookkeeping untouched in coronas mode', () => {
    const first = resolveAnswer(readyGame(), true);
    const second = resolveAnswer(first.state, false);

    expect(second.state.round).toBe(1);
    expect(second.state.roundAnswers).toEqual([0, 0]);
    expect(second.state.roundWins).toEqual([0, 0]);
  });
});

describe('end game', () => {
  it('ends a coronas game when a player holds all six crowns', () => {
    const five = patchPlayer(readyGame(), 0, {
      crowns: [...SIX_CROWNS].slice(0, 5),
      crownTally: 2,
    });
    const step = resolveAnswer(five, true);

    expect(step.value).toBe('crown-pick');
    const picked = resolveCrownPick(step.state, 'ciencia');

    expect(picked.value).toBe('ended');
    expect(picked.state.status).toBe('ended');
    expect(picked.state.winner).toBe(0);
  });

  it('keeps playing with five crowns', () => {
    const five = patchPlayer(readyGame(), 0, { crowns: [...SIX_CROWNS].slice(0, 5) });
    const step = resolveAnswer(five, false);

    expect(step.value).toBe('continue');
    expect(step.state.status).toBe('answering');
    expect(step.state.winner).toBeNull();
  });

  it('ends a rondas game when the tenth round closes', () => {
    const state = rondas({
      round: 10,
      roundAnswers: [1, 0],
      roundPoints: [100, 0],
      roundWins: [3, 2],
    });
    const step = resolveAnswer({ ...state, currentTurn: 1 }, false);

    expect(step.value).toBe('ended');
    expect(step.state.round).toBe(11);
    expect(step.state.status).toBe('ended');
    expect(step.state.winner).toBe(0);
  });

  it('keeps a tied tenth round playing into sudden death', () => {
    const state = rondas({
      round: 10,
      roundAnswers: [1, 0],
      roundPoints: [0, 0],
      roundWins: [3, 3],
    });
    const step = resolveAnswer({ ...state, currentTurn: 1 }, false);

    expect(step.value).toBe('continue');
    expect(step.state.status).toBe('answering');
    expect(step.state.winner).toBeNull();
    expect(step.state.round).toBe(11);
  });

  it('ends on the first decisive sudden-death round and credits its winner', () => {
    const tied: GameState = rondas({
      round: 11,
      roundAnswers: [1, 0],
      roundPoints: [100, 0],
      roundWins: [5, 5],
    });
    const step = resolveAnswer({ ...tied, currentTurn: 1 }, false);

    expect(step.value).toBe('ended');
    expect(step.state.status).toBe('ended');
    expect(step.state.roundWins).toEqual([6, 5]);
    expect(step.state.round).toBe(12);
    expect(step.state.winner).toBe(0);
  });

  it('ends a sudden-death round won by the second player', () => {
    const tied: GameState = rondas({
      round: 11,
      roundAnswers: [1, 0],
      roundPoints: [0, 100],
      roundWins: [5, 5],
    });
    const step = resolveAnswer({ ...tied, currentTurn: 1 }, true);

    expect(step.value).toBe('ended');
    expect(step.state.roundWins).toEqual([5, 6]);
    expect(step.state.winner).toBe(1);
  });

  it('keeps playing after a tied sudden-death round', () => {
    const tied: GameState = rondas({
      round: 11,
      roundAnswers: [1, 0],
      roundPoints: [0, 0],
      roundWins: [5, 5],
    });
    const step = resolveAnswer({ ...tied, currentTurn: 1 }, false);

    expect(step.value).toBe('continue');
    expect(step.state.status).toBe('answering');
    expect(step.state.roundWins).toEqual([5, 5]);
    expect(step.state.round).toBe(12);
    expect(step.state.winner).toBeNull();
  });

  it('never ends a rondas game with the round-wins tied, however long sudden death runs', () => {
    const base: GameState = rondas({
      round: 10,
      roundAnswers: [1, 0],
      roundPoints: [0, 0],
      roundWins: [5, 5],
    });
    // Six sudden-death rounds: a scoreless round, a round where both score, then four
    // more scoreless rounds. None of them can end the game.
    const tiedRounds: ReadonlyArray<readonly [boolean, boolean]> = [
      [false, false],
      [true, true],
      [false, false],
      [false, false],
      [false, false],
      [false, false],
    ];

    let step = resolveAnswer({ ...base, currentTurn: 1 }, false);
    expect(step.value).toBe('continue');

    for (const [first, second] of tiedRounds) {
      expect(step.state.roundWins).toEqual([5, 5]);
      expect(step.state.status).toBe('answering');

      step = playRound(step.state, first, second);
      expect(step.value).toBe('continue');
    }

    const decided = playRound(step.state, true, false);

    expect(decided.value).toBe('ended');
    expect(decided.state.roundWins).toEqual([6, 5]);
    expect(decided.state.winner).toBe(0);
  });
});

describe('resolveGameEnd', () => {
  it('does nothing while no win condition is met', () => {
    const state = readyGame();
    const step = resolveGameEnd(state);

    expect(step.value).toBe(false);
    expect(step.state.status).toBe('answering');
  });

  it('applies the win condition on demand', () => {
    const state = patchPlayer(readyGame(), 1, { crowns: [...SIX_CROWNS] });
    const step = resolveGameEnd(state);

    expect(step.value).toBe(true);
    expect(step.state.status).toBe('ended');
    expect(step.state.winner).toBe(1);
  });

  it('does not end a tied rondas game past the tenth round', () => {
    const tied: GameState = rondas({ round: 11, roundWins: [5, 5] });
    const step = resolveGameEnd(tied);

    expect(step.value).toBe(false);
    expect(step.state.status).toBe('answering');
    expect(step.state.winner).toBeNull();
  });

  it('reports no change on an already ended game', () => {
    const ended: GameState = { ...readyGame(), status: 'ended', winner: 0 };
    expect(resolveGameEnd(ended).value).toBe(false);
  });
});

describe('GameProvider actions', () => {
  function setup() {
    return renderHook(() => useGame(), { wrapper: GameProvider });
  }

  it('answerQuestion writes the resolution into shared state and reports the outcome', () => {
    const { result } = setup();

    act(() => {
      result.current.startGame();
    });
    act(() => {
      result.current.land('arte');
    });

    const answerer = result.current.state.currentTurn;
    const waiting = answerer === 0 ? 1 : 0;

    let outcome = 'none';
    act(() => {
      outcome = result.current.answerQuestion(true);
    });

    expect(outcome).toBe('continue');
    expect(result.current.state.players[answerer].score).toBe(100);
    expect(result.current.state.players[waiting].score).toBe(0);
    expect(result.current.state.currentTurn).toBe(waiting);
  });

  it('usePowerup, pickCrown, startUltraChallenge and endGame are wired to the store', () => {
    const { result } = setup();

    act(() => {
      result.current.setConfig({
        mode: 'coronas',
        timePerTurn: 15,
        powerups: ['hint'],
        language: 'es',
      });
    });
    act(() => {
      result.current.startGame();
    });
    act(() => {
      result.current.land('arte');
    });

    const turn = result.current.state.currentTurn;

    let spent = false;
    act(() => {
      spent = result.current.usePowerup('hint');
    });
    expect(spent).toBe(true);
    expect(result.current.state.players[turn].powerups.hint).toBe(0);

    let started = false;
    act(() => {
      started = result.current.startUltraChallenge('ciencia');
    });
    expect(started).toBe(true);
    expect(result.current.state.ultraChallenge).toBe('ciencia');

    let ultraOutcome = 'none';
    act(() => {
      ultraOutcome = result.current.resolveUltra(true);
    });
    expect(ultraOutcome).toBe('continue');
    expect(result.current.state.players[turn].crowns).toEqual(['ciencia']);

    let ended = false;
    act(() => {
      ended = result.current.endGame();
    });
    expect(ended).toBe(false);

    let crownOutcome = 'none';
    act(() => {
      crownOutcome = result.current.pickCrown('arte');
    });
    expect(crownOutcome).toBe('none');
  });
});
