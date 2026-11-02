import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilesProvider, useProfiles } from '../../lib/profiles/ProfilesProvider';
import { createEmptyProfile, saveProfiles } from '../../lib/profiles/storage';
import GlobalRanking from './GlobalRanking';

beforeEach(() => {
  localStorage.clear();
});

function ImportButton({ json }: { json: string }) {
  const { importProfiles } = useProfiles();
  return (
    <button type="button" onClick={() => importProfiles(json)}>
      Importar
    </button>
  );
}

function renderRanking() {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <ProfilesProvider>
        <GlobalRanking onClose={onClose} />
      </ProfilesProvider>
    </MemoryRouter>,
  );
  return onClose;
}

describe('GlobalRanking', () => {
  it('shows the empty state when no profile is loaded', () => {
    renderRanking();

    expect(screen.getByTestId('ranking-empty')).toHaveTextContent('Todavía no hay perfiles');
  });

  it('orders the loaded profiles by experience', () => {
    saveProfiles([
      { ...createEmptyProfile('Baja'), totalXp: 20 },
      { ...createEmptyProfile('Alta'), totalXp: 800 },
    ]);

    renderRanking();

    const rows = screen.getAllByTestId(/^ranking-row-/);
    expect(rows[0]).toHaveTextContent('Alta');
    expect(rows[1]).toHaveTextContent('Baja');
    expect(screen.getByText('2 perfiles cargados')).toBeInTheDocument();
  });

  it('lists a profile as soon as it is imported from JSON', () => {
    const imported = { ...createEmptyProfile('Importado'), totalXp: 500 };
    const json = JSON.stringify({ profiles: [imported] });

    render(
      <MemoryRouter>
        <ProfilesProvider>
          <GlobalRanking onClose={vi.fn()} />
          <ImportButton json={json} />
        </ProfilesProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    const modal = screen.getByTestId('ranking-modal');
    expect(within(modal).getByText('Importado')).toBeInTheDocument();
    expect(within(modal).getByText('500 XP')).toBeInTheDocument();
  });

  it('closes on Escape and on the close button', () => {
    const onClose = renderRanking();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ranking' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
