import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../App';
import { playSound } from '../lib/audio';
import { createInitialState, GameProvider, useGame } from '../lib/game/GameProvider';
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
    <GameProvider initialState={initialState}>
      <MemoryRouter initialEntries={['/resultados']}>
        <StateProbe />
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>
    </GameProvider>,
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
});
