import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Category } from '../lib/api/types';
import { playSound } from '../lib/audio';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/constants/categories';
import { GameProvider, useGame } from '../lib/game/GameProvider';
import { SPIN_DURATION_MS, WHEEL_CATEGORIES } from '../lib/game/spin';
import type { GameState } from '../lib/game/types';
import Pregunta from './Pregunta';
import Ruleta from './Ruleta';

vi.mock('../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio')>();
  return { ...actual, playSound: vi.fn() };
});

const playMock = vi.mocked(playSound);

beforeEach(() => {
  playMock.mockClear();
});

const CANONICAL_CATEGORIES: Category[] = WHEEL_CATEGORIES.map((name) => ({
  name,
  label: CATEGORY_LABELS[name],
  label_en: name,
  description: 'description',
}));

function StateProbe() {
  const { state } = useGame();
  return <output data-testid="state-probe">{JSON.stringify(state)}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}</output>;
}

function renderRuleta() {
  return render(
    <GameProvider>
      <MemoryRouter initialEntries={['/ruleta']}>
        <StateProbe />
        <LocationProbe />
        <Routes>
          <Route path="/ruleta" element={<Ruleta />} />
          <Route path="/pregunta" element={<Pregunta />} />
        </Routes>
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

function stubFetchSuccess() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(CANONICAL_CATEGORIES),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubFetchFailure() {
  const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubFetchList(categories: Category[]) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(categories),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function categoriesFor(names: readonly string[]): Category[] {
  return names.map((name) => ({
    name,
    label: name,
    label_en: name,
    description: 'description',
  }));
}

async function flushMicrotasks() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) {
      await Promise.resolve();
    }
  });
}

function spinButton() {
  return screen.getByRole('button', { name: 'Girar Ruleta' });
}

function segmentFills(): (string | null | undefined)[] {
  return screen
    .getAllByTestId('wheel-segment')
    .map((segment) => segment.querySelector('path')?.getAttribute('fill'));
}

const canonicalFills = WHEEL_CATEGORIES.map((name) => CATEGORY_COLORS[name]);

describe('Ruleta', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the six canonical segments colored by the canonical map from the API', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetchSuccess();

    renderRuleta();
    await flushMicrotasks();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/categories');
    expect(screen.getByRole('heading', { name: '¡Gran Ruleta Arcade!' })).toBeInTheDocument();
    expect(segmentFills()).toEqual(canonicalFills);
  });

  it('falls back to the six canonical segments when the categories request fails', async () => {
    vi.useFakeTimers();
    stubFetchFailure();

    renderRuleta();
    await flushMicrotasks();

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(6);
    expect(segmentFills()).toEqual(canonicalFills);
  });

  it('falls back to the six canonical segments when the API returns fewer than six', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CANONICAL_CATEGORIES.slice(0, 3)),
      }),
    );

    renderRuleta();
    await flushMicrotasks();

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(6);
    expect(segmentFills()).toEqual(canonicalFills);
  });

  it('orders the wheel canonically when the API returns the categories shuffled', async () => {
    vi.useFakeTimers();
    stubFetchList(
      categoriesFor(['ciencia', 'arte', 'deportes', 'geografia', 'historia', 'entretenimiento']),
    );
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    const categories = screen
      .getAllByTestId('wheel-segment')
      .map((segment) => segment.getAttribute('data-category'));
    expect(categories).toEqual([...WHEEL_CATEGORIES]);
    expect(segmentFills()).toEqual(canonicalFills);

    fireEvent.click(spinButton());
    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });

    // Resolver uses canonical order, matching the segment painted under the pointer.
    expect(readState().currentCategory).toBe('arte');
    expect(within(screen.getByRole('dialog')).getByText('Arte')).toBeInTheDocument();
  });

  it('falls back to the six canonical segments when the API returns a duplicate name', async () => {
    vi.useFakeTimers();
    stubFetchList(
      categoriesFor(['arte', 'arte', 'historia', 'deportes', 'entretenimiento', 'geografia']),
    );

    renderRuleta();
    await flushMicrotasks();

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(6);
    expect(segmentFills()).toEqual(canonicalFills);
  });

  it('falls back to the six canonical segments when the API returns a non-canonical name', async () => {
    vi.useFakeTimers();
    stubFetchList(
      categoriesFor([
        'arte',
        'historia',
        'deportes',
        'entretenimiento',
        'geografia',
        'videojuegos',
      ]),
    );

    renderRuleta();
    await flushMicrotasks();

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(6);
    expect(segmentFills()).toEqual(canonicalFills);
  });

  it('shows the turn indicator on the active player and a waiting state on the other', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();

    renderRuleta();
    await flushMicrotasks();

    expect(within(screen.getByTestId('player-card-0')).getByText('Tu Turno')).toBeInTheDocument();
    expect(within(screen.getByTestId('player-card-1')).getByText('En Espera')).toBeInTheDocument();
  });

  it('spin lands on exactly one category and records it in shared state', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    fireEvent.click(spinButton());
    expect(spinButton()).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });

    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(readState().currentCategory).toBe('arte');
    expect(readState().status).toBe('answering');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Arte')).toBeInTheDocument();
  });

  it('rotates the wheel by at least five full turns when a spin starts', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    const wheel = screen.getByTestId('roulette-wheel');
    expect(wheel.style.transform).toBe('rotate(0deg)');

    fireEvent.click(spinButton());

    const degrees = Number(wheel.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1]);
    expect(degrees).toBeGreaterThanOrEqual(1800);
  });

  it('starts no second spin on a repeated click while already spinning', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    const button = spinButton();
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers both actions in the result modal', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    fireEvent.click(spinButton());
    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Jugar Pregunta' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Girar de Nuevo' })).toBeInTheDocument();
  });

  it('Jugar Pregunta navigates to /pregunta with the category in shared state', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    fireEvent.click(spinButton());
    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Jugar Pregunta' }));

    expect(pathname()).toBe('/pregunta');
    expect(readState().currentCategory).toBe('arte');
    expect(screen.getByRole('heading', { name: '¡Pregunta en Vivo!' })).toBeInTheDocument();
  });

  it('Girar de Nuevo closes the modal and re-enables the spin without navigating', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    fireEvent.click(spinButton());
    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Girar de Nuevo' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(pathname()).toBe('/ruleta');
    expect(spinButton()).toBeEnabled();
  });

  it('requests one wheel-spin cue for an accepted spin and none for a blocked one', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    const button = spinButton();
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(playMock.mock.calls).toEqual([['wheel-spin']]);
  });

  it('requests wheel-land when the wheel settles, never before', async () => {
    vi.useFakeTimers();
    stubFetchSuccess();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    renderRuleta();
    await flushMicrotasks();

    fireEvent.click(spinButton());
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('wheel-spin');

    act(() => {
      vi.advanceTimersByTime(SPIN_DURATION_MS - 1);
    });
    expect(playMock).not.toHaveBeenCalledWith('wheel-land');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(playMock.mock.calls).toEqual([['wheel-spin'], ['wheel-land']]);
    expect(readState().currentCategory).toBe('arte');
  });
});
