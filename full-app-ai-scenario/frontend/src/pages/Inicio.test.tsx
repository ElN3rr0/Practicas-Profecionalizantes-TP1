import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { playSound } from '../lib/audio';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/constants/categories';
import Inicio from './Inicio';

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audio')>();
  return { ...actual, playSound: vi.fn() };
});

const playMock = vi.mocked(playSound);

function renderInicio() {
  return render(
    <MemoryRouter>
      <Inicio />
    </MemoryRouter>,
  );
}

describe('Inicio', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    playMock.mockClear();
  });

  it('renders the hero headline and subtitle', () => {
    renderInicio();

    expect(screen.getByRole('heading', { name: '¡A VER SI SABÉS!' })).toBeInTheDocument();
    expect(
      screen.getByText(/Demuestra quién sabe más en la arena definitiva de trivia/),
    ).toBeInTheDocument();
  });

  it('renders the six category chips with Spanish labels', () => {
    renderInicio();

    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('category-chip')).toHaveLength(6);
  });

  it('renders the ring with all six canonical category colors', () => {
    renderInicio();

    const ring = screen.getByTestId('holographic-ring');
    for (const color of Object.values(CATEGORY_COLORS)) {
      expect(ring.style.backgroundImage).toContain(color);
    }
  });

  it('navigates to /usuarios when the CTA is clicked', () => {
    renderInicio();

    fireEvent.click(
      screen.getByRole('button', { name: 'Toca el logo o presiona aquí para comenzar' }),
    );

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/usuarios');
  });

  it('navigates to /usuarios when the disc is clicked', () => {
    renderInicio();

    fireEvent.click(screen.getByRole('button', { name: 'Toca el logo para comenzar' }));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/usuarios');
  });

  it('navigates only once on a rapid double click', () => {
    renderInicio();

    const cta = screen.getByRole('button', { name: 'Toca el logo o presiona aquí para comenzar' });
    fireEvent.click(cta);
    fireEvent.click(cta);

    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it('requests one click cue per launch', () => {
    renderInicio();

    fireEvent.click(
      screen.getByRole('button', { name: 'Toca el logo o presiona aquí para comenzar' }),
    );

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('click');
  });

  it('requests the click cue from the disc too, once for the interaction', () => {
    renderInicio();

    fireEvent.click(screen.getByRole('button', { name: 'Toca el logo para comenzar' }));

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(playMock).toHaveBeenCalledWith('click');
  });

  it('requests no second cue when the guarded launch is clicked again', () => {
    renderInicio();

    const cta = screen.getByRole('button', { name: 'Toca el logo o presiona aquí para comenzar' });
    fireEvent.click(cta);
    fireEvent.click(cta);

    expect(playMock).toHaveBeenCalledTimes(1);
  });
});
