import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { playSound } from '../lib/audio';
import { GameProvider, useGame } from '../lib/game/GameProvider';
import type { GameState } from '../lib/game/types';
import Usuarios from './Usuarios';
import Ruleta from './Ruleta';

vi.mock('../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio')>();
  return { ...actual, playSound: vi.fn() };
});

const playMock = vi.mocked(playSound);

beforeEach(() => {
  playMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function StateProbe() {
  const { state } = useGame();
  return <output data-testid="state-probe">{JSON.stringify(state)}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

function renderUsuarios() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(
    <GameProvider>
      <MemoryRouter initialEntries={['/usuarios']}>
        <StateProbe />
        <LocationProbe />
        <Routes>
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/ruleta" element={<Ruleta />} />
        </Routes>
      </MemoryRouter>
    </GameProvider>,
  );
}

function readState(): GameState {
  const raw = screen.getByTestId('state-probe').textContent ?? '';
  return JSON.parse(raw) as GameState;
}

function pathname(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function clickComenzar() {
  fireEvent.click(screen.getByRole('button', { name: 'Comenzar' }));
}

describe('Usuarios', () => {
  it('renders two player cards with a name field each', () => {
    renderUsuarios();

    expect(screen.getByText('Jugador 1')).toBeInTheDocument();
    expect(screen.getByText('Jugador 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de Jugador 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de Jugador 2')).toBeInTheDocument();
  });

  it('defaults both names on empty and navigates to /ruleta', async () => {
    renderUsuarios();

    clickComenzar();

    expect(
      await screen.findByRole('heading', { name: '¡Gran Ruleta Arcade!' }),
    ).toBeInTheDocument();
    expect(pathname()).toBe('/ruleta');
    expect(readState().players.map((p) => p.name)).toEqual(['Jugador 1', 'Jugador 2']);
  });

  it('persists entered names and navigates to /ruleta', async () => {
    renderUsuarios();

    fireEvent.change(screen.getByLabelText('Nombre de Jugador 1'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Nombre de Jugador 2'), { target: { value: 'Luis' } });
    clickComenzar();

    expect(
      await screen.findByRole('heading', { name: '¡Gran Ruleta Arcade!' }),
    ).toBeInTheDocument();
    expect(pathname()).toBe('/ruleta');
    expect(readState().players.map((p) => p.name)).toEqual(['Ana', 'Luis']);
  });

  it('records mode, timer, and powerup selection into shared state on start', () => {
    renderUsuarios();

    fireEvent.click(screen.getByRole('button', { name: '10 Rondas' }));
    fireEvent.click(screen.getByRole('button', { name: '30s' }));
    fireEvent.click(screen.getByRole('button', { name: '50/50' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pista' }));
    clickComenzar();

    const state = readState();
    expect(state.config).toEqual({
      mode: 'rondas',
      timePerTurn: 30,
      powerups: ['fifty-fifty', 'hint'],
      language: 'es',
    });
    expect(state.round).toBe(1);
    expect(state.roundWins).toEqual([0, 0]);
    expect(state.winner).toBeNull();
  });

  it('initializes each player powerup inventory from the selection', () => {
    renderUsuarios();

    fireEvent.click(screen.getByRole('button', { name: '50/50' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pista' }));
    clickComenzar();

    const state = readState();
    const expected = {
      'fifty-fifty': 1,
      'second-chance': 0,
      'plus-time': 0,
      'skip-question': 0,
      hint: 1,
    };
    expect(state.players[0].powerups).toEqual(expected);
    expect(state.players[1].powerups).toEqual(expected);
  });

  it('establishes the coronas start state by default', () => {
    renderUsuarios();

    clickComenzar();

    const state = readState();
    expect(state.config.mode).toBe('coronas');
    expect(state.players[0].crowns).toEqual([]);
    expect(state.players[0].crownTally).toBe(0);
    expect(state.players[1].crowns).toEqual([]);
    expect(state.players[1].crownTally).toBe(0);
    expect(state.roundWins).toEqual([0, 0]);
    expect(state.winner).toBeNull();
  });

  it('assigns a random first turn of 0 or 1', () => {
    renderUsuarios();

    clickComenzar();

    expect([0, 1]).toContain(readState().currentTurn);
  });

  it('requests one click cue when the game starts', () => {
    renderUsuarios();

    clickComenzar();

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('click');
  });
});
