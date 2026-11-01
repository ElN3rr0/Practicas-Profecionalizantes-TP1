import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../App';
import { playSound } from '../lib/audio';
import { createInitialState, GameProvider, useGame } from '../lib/game/GameProvider';
import { ProfilesProvider } from '../lib/profiles/ProfilesProvider';
import { createEmptyProfile, PROFILES_STORAGE_KEY, saveProfiles } from '../lib/profiles/storage';
import { WHEEL_CATEGORIES } from '../lib/game/spin';
import type { GameState } from '../lib/game/types';
import { finishedGame } from '../test/gameState';

vi.mock('../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio')>();
  return { ...actual, playSound: vi.fn() };
});

const playMock = vi.mocked(playSound);

beforeEach(() => {
  playMock.mockReset();
  localStorage.clear();
});

const EVERY_CROWN = [...WHEEL_CATEGORIES];

function StateProbe() {
  const { state } = useGame();
  return <output data-testid="state-probe">{JSON.stringify(state)}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

function renderResults(initialState?: GameState) {
  return render(
    <ProfilesProvider>
      <GameProvider initialState={initialState}>
        <MemoryRouter initialEntries={['/resultados']}>
          <StateProbe />
          <LocationProbe />
          <AppRoutes />
        </MemoryRouter>
      </GameProvider>
    </ProfilesProvider>,
  );
}

function readState(): GameState {
  return JSON.parse(screen.getByTestId('state-probe').textContent ?? '') as GameState;
}

function pathname(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function banner() {
  return within(screen.getByTestId('winner-banner'));
}

describe('Resultados', () => {
  it('renders the results view inside the app shell', () => {
    renderResults(finishedGame({ crowns: [EVERY_CROWN, []], winner: 0 }));

    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByTestId('winner-banner')).toBeInTheDocument();
  });

  it('declares the player holding all six crowns as the winner', () => {
    renderResults(
      finishedGame({
        mode: 'coronas',
        winner: 1,
        names: ['Ana', 'Luis'],
        scores: [300, 900],
        crowns: [[], EVERY_CROWN],
      }),
    );

    expect(screen.getByRole('heading', { name: '¡Gana Luis!' })).toBeInTheDocument();
    expect(banner().getByText('6 de 6 coronas')).toBeInTheDocument();
    expect(within(screen.getByTestId('result-card-1')).getByText('Ganador')).toBeInTheDocument();
    expect(within(screen.getByTestId('result-card-0')).getByText('Finalista')).toBeInTheDocument();
  });

  it('declares the player with more round-wins as the winner', () => {
    renderResults(
      finishedGame({
        mode: 'rondas',
        winner: 0,
        roundWins: [7, 3],
        names: ['Ana', 'Luis'],
        scores: [700, 300],
      }),
    );

    expect(screen.getByRole('heading', { name: '¡Gana Ana!' })).toBeInTheDocument();
    expect(banner().getByText('7 rondas ganadas')).toBeInTheDocument();
  });

  it('summarizes a sudden-death game in rounds won, never a ten-round total', () => {
    renderResults(
      finishedGame({
        mode: 'rondas',
        winner: 0,
        roundWins: [8, 7],
        names: ['Ana', 'Luis'],
        scores: [800, 700],
      }),
    );

    expect(screen.getByRole('heading', { name: '¡Gana Ana!' })).toBeInTheDocument();
    expect(banner().getByText('8 rondas ganadas')).toBeInTheDocument();
    expect(screen.queryByText(/de 10 rondas/)).not.toBeInTheDocument();
  });

  it('declares Jugador 1 on a tied round count, which the game cannot end on', () => {
    renderResults(
      finishedGame({
        mode: 'rondas',
        winner: null,
        roundWins: [5, 5],
        names: ['Ana', 'Luis'],
        scores: [400, 900],
      }),
    );

    expect(screen.getByRole('heading', { name: '¡Gana Ana!' })).toBeInTheDocument();
  });

  it('declares no winner and still offers a new game when nothing has been played', () => {
    renderResults();

    expect(screen.getByRole('heading', { name: 'Todavía no hay ganador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jugar de nuevo' })).toBeInTheDocument();
    expect(within(screen.getByTestId('result-card-0')).getByText('Finalista')).toBeInTheDocument();
    expect(within(screen.getByTestId('result-card-1')).getByText('Finalista')).toBeInTheDocument();
  });

  it('Jugar de nuevo resets the shared state and returns to Inicio', () => {
    renderResults(
      finishedGame({
        mode: 'rondas',
        winner: 0,
        roundWins: [7, 3],
        names: ['Ana', 'Luis'],
        scores: [700, 300],
      }),
    );
    expect(pathname()).toBe('/resultados');
    expect(readState().status).toBe('ended');

    fireEvent.click(screen.getByRole('button', { name: 'Jugar de nuevo' }));

    expect(readState()).toEqual(createInitialState());
    expect(readState().status).toBe('setup');
    expect(readState().winner).toBeNull();
    expect(readState().players.map((player) => player.score)).toEqual([0, 0]);
    expect(readState().players.map((player) => player.crowns)).toEqual([[], []]);
    expect(pathname()).toBe('/');
    expect(screen.getByRole('heading', { name: '¡A VER SI SABÉS!' })).toBeInTheDocument();
  });

  it('requests the victory cue once when a winner is declared', () => {
    renderResults(finishedGame({ crowns: [EVERY_CROWN, []], winner: 0 }));

    expect(playMock.mock.calls).toEqual([['victory']]);
  });

  it('requests the defeat cue for the defensive no-winner state', () => {
    renderResults();

    expect(playMock.mock.calls).toEqual([['defeat']]);
  });

  it('pays winner and loser exactly once when the game finishes', () => {
    const ana = createEmptyProfile('Ana');
    const luis = createEmptyProfile('Luis');
    saveProfiles([ana, luis]);

    const base = finishedGame({ mode: 'coronas', winner: 0, crowns: [EVERY_CROWN, []] });
    const state: GameState = {
      ...base,
      gameId: 'game-pay-1',
      players: [
        {
          ...base.players[0],
          profileId: ana.id,
          correctAnswers: 8,
          incorrectAnswers: 1,
          bestStreak: 4,
        },
        {
          ...base.players[1],
          profileId: luis.id,
          correctAnswers: 1,
          incorrectAnswers: 2,
          bestStreak: 1,
        },
      ],
    };

    const first = renderResults(state);

    // Winner: 8*10 + 20 + 30 = 130 XP · 8*3 + 10 + 15 = 49 coins
    expect(screen.getByTestId('reward-line-0')).toHaveTextContent('+130 XP');
    expect(screen.getByTestId('reward-line-0')).toHaveTextContent('+49 monedas');
    // Level 2 threshold is 100 XP, so the winner levels up.
    expect(screen.getByTestId('level-up-2')).toBeInTheDocument();
    // Loser: 1*10 + 20 = 30 XP · 1*3 + 10 = 13 coins
    expect(screen.getByTestId('reward-line-1')).toHaveTextContent('+30 XP');
    expect(screen.getByTestId('reward-line-1')).toHaveTextContent('+13 monedas');

    const readStored = () =>
      JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? '[]') as {
        id: string;
        totalXp: number;
        totalCoins: number;
      }[];

    expect(readStored().find((profile) => profile.id === ana.id)?.totalXp).toBe(130);
    expect(readStored().find((profile) => profile.id === luis.id)?.totalXp).toBe(30);

    // The winner's first win unlocks the "Primera victoria" badge.
    expect(screen.getByTestId('new-achievements-0')).toHaveTextContent('Primera victoria');

    // Re-rendering the same finished game must not pay again.
    first.unmount();
    renderResults(state);

    expect(readStored().find((profile) => profile.id === ana.id)?.totalXp).toBe(130);
    expect(readStored().find((profile) => profile.id === luis.id)?.totalXp).toBe(30);
  });

  it('shows the tournament series and starts the next game keeping the score', () => {
    renderResults(
      finishedGame({
        mode: 'coronas',
        winner: 0,
        crowns: [EVERY_CROWN, []],
        tournament: true,
        seriesWins: [1, 0],
        names: ['Ana', 'Luis'],
      }),
    );

    expect(screen.getByTestId('series-score')).toHaveTextContent('Torneo al mejor de 3');
    expect(screen.getByTestId('series-score')).toHaveTextContent('1 — 0');
    expect(screen.queryByTestId('series-champion')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente partida del torneo' }));

    expect(pathname()).toBe('/ruleta');
    expect(readState().status).toBe('spinning');
    expect(readState().seriesWins).toEqual([1, 0]);
  });

  it('declares the series champion and resets the series on a new tournament', () => {
    renderResults(
      finishedGame({
        mode: 'coronas',
        winner: 1,
        crowns: [[], EVERY_CROWN],
        tournament: true,
        seriesWins: [0, 2],
        names: ['Ana', 'Luis'],
      }),
    );

    expect(screen.getByTestId('series-champion')).toHaveTextContent('¡Luis gana el torneo!');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo torneo' }));

    expect(pathname()).toBe('/ruleta');
    expect(readState().status).toBe('spinning');
    expect(readState().seriesWins).toEqual([0, 0]);
  });

  it('awards the game to the rival when a player retires', () => {
    const ana = createEmptyProfile('Ana');
    const luis = createEmptyProfile('Luis');
    saveProfiles([ana, luis]);

    const base = finishedGame({ retiredBy: 0, winner: 1, names: ['Ana', 'Luis'] });
    const state: GameState = {
      ...base,
      gameId: 'retired-game-1',
      players: [
        { ...base.players[0], profileId: ana.id, correctAnswers: 2, incorrectAnswers: 1 },
        { ...base.players[1], profileId: luis.id, correctAnswers: 1, incorrectAnswers: 0 },
      ],
    };

    renderResults(state);

    expect(screen.getByTestId('winner-name')).toHaveTextContent('¡Gana Luis!');
    expect(screen.getByTestId('retirement-note')).toHaveTextContent('Ana se retiró');
    expect(screen.getByTestId('retirement-line-0')).toHaveTextContent('sin recompensas');
    // Winner: 1*10 + 20 + 30 XP · 1*3 + 10 + 15 coins.
    expect(screen.getByTestId('reward-line-1')).toHaveTextContent('+60 XP');
    expect(screen.getByTestId('reward-line-1')).toHaveTextContent('+28 monedas');
  });
});
