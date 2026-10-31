import { describe, expect, it } from 'vitest';
import type {
  CategoryName,
  GameConfig,
  GameMode,
  GameState,
  Player,
  PowerupId,
  PowerupInventory,
} from './types';

function emptyInventory(): PowerupInventory {
  return {
    'fifty-fifty': 0,
    'second-chance': 0,
    'plus-time': 0,
    'skip-question': 0,
    hint: 0,
  };
}

describe('game state types', () => {
  it('accepts every PowerupId in a PowerupInventory', () => {
    const inventory: PowerupInventory = {
      ...emptyInventory(),
      'fifty-fifty': 1,
      hint: 2,
    };
    expect(inventory['fifty-fifty']).toBe(1);
    expect(inventory.hint).toBe(2);
  });

  it('constructs a complete GameState with all frozen fields', () => {
    const mode: GameMode = 'coronas';
    const enabledPowerups: PowerupId[] = ['fifty-fifty', 'second-chance'];
    const crowns: CategoryName[] = ['ciencia', 'arte'];

    const players: [Player, Player] = [
      {
        id: 0,
        name: 'Jugadora 1',
        avatar: 'zorro',
        score: 2,
        crowns,
        crownTally: 1,
        powerups: emptyInventory(),
      },
      {
        id: 1,
        name: 'Jugador 2',
        avatar: 'gato',
        score: 0,
        crowns: [],
        crownTally: 0,
        powerups: emptyInventory(),
      },
    ];
    const config: GameConfig = { mode, timePerTurn: 15, powerups: enabledPowerups, language: 'es' };

    const state: GameState = {
      players,
      config,
      currentTurn: 0,
      round: 1,
      roundWins: [0, 0],
      winner: null,
      ultraChallenge: 'historia',
      status: 'answering',
      currentCategory: 'historia',
      roundPoints: [0, 0],
      roundAnswers: [0, 0],
      awaitingCrown: false,
      retryUsed: false,
      ultraUsed: false,
    };

    expect(state.config.mode).toBe('coronas');
    expect(state.players).toHaveLength(2);
    expect(state.currentTurn).toBe(0);
    expect(state.winner).toBeNull();
    expect(state.currentCategory).toBe('historia');
  });
});
