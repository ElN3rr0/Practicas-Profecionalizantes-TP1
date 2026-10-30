import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App, { AppRoutes } from './App';
import { GameProvider } from './lib/game/GameProvider';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderRoute(initialPath: string) {
  return render(
    <GameProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </GameProvider>,
  );
}

describe('App', () => {
  it('renders the shell and the hero at the root route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '¡A VER SI SABÉS!' })).toBeInTheDocument();
    expect(screen.getByText('A Ver Si Sabés')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the player setup screen at /usuarios', () => {
    renderRoute('/usuarios');
    expect(screen.getByText('Modo Cara a Cara')).toBeInTheDocument();
    expect(screen.getByText('Jugador 1')).toBeInTheDocument();
    expect(screen.getByText('Jugador 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comenzar' })).toBeInTheDocument();
  });

  it('renders the results screen at /resultados', () => {
    renderRoute('/resultados');
    expect(screen.getByRole('heading', { name: 'Todavía no hay ganador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jugar de nuevo' })).toBeInTheDocument();
  });

  it('renders the question arena at /pregunta and asks for a category when none is resolved', () => {
    renderRoute('/pregunta');
    expect(screen.getByRole('heading', { name: '¡Pregunta en Vivo!' })).toBeInTheDocument();
    expect(screen.getByText('No hay categoría seleccionada')).toBeInTheDocument();
  });

  it('renders the wheel screen at /ruleta', async () => {
    const categories = [
      { name: 'arte', label: 'Arte', label_en: 'Art', description: '' },
      { name: 'historia', label: 'Historia', label_en: 'History', description: '' },
      { name: 'deportes', label: 'Deportes', label_en: 'Sports', description: '' },
      {
        name: 'entretenimiento',
        label: 'Entretenimiento',
        label_en: 'Entertainment',
        description: '',
      },
      { name: 'geografia', label: 'Geografía', label_en: 'Geography', description: '' },
      { name: 'ciencia', label: 'Ciencia', label_en: 'Science', description: '' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(categories) }),
    );

    renderRoute('/ruleta');

    expect(screen.getByRole('heading', { name: '¡Gran Ruleta Arcade!' })).toBeInTheDocument();
    expect(await screen.findAllByTestId('wheel-segment')).toHaveLength(6);
  });
});
