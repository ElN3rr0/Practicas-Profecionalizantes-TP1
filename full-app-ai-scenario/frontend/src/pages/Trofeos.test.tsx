import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilesProvider } from '../lib/profiles/ProfilesProvider';
import { createEmptyProfile, saveProfiles } from '../lib/profiles/storage';
import type { Profile } from '../lib/profiles/types';
import Trofeos from './Trofeos';

beforeEach(() => {
  localStorage.clear();
});

function renderTrophies(profile: Profile) {
  saveProfiles([profile]);
  return render(
    <ProfilesProvider>
      <MemoryRouter initialEntries={[`/trofeos/${profile.id}`]}>
        <Routes>
          <Route path="/trofeos/:profileId" element={<Trofeos />} />
        </Routes>
      </MemoryRouter>
    </ProfilesProvider>,
  );
}

describe('Trofeos', () => {
  it('shows achievements unlocked from the profile stats', () => {
    const base = createEmptyProfile('Ana');
    const profile: Profile = {
      ...base,
      totalXp: 150,
      stats: { ...base.stats, wins: 1, bestStreak: 5, correctAnswers: 10 },
    };
    renderTrophies(profile);

    expect(screen.getByTestId('achievement-first_win')).toHaveTextContent('Desbloqueada');
    expect(screen.getByTestId('achievement-streak_5')).toHaveTextContent('Desbloqueada');
    expect(screen.getByTestId('achievement-perfect_10')).toHaveTextContent('Desbloqueada');
    expect(screen.getByTestId('achievement-ten_games')).toHaveTextContent('Bloqueada');
  });

  it('shows equipped cosmetics', () => {
    const base = createEmptyProfile('Ana');
    const profile: Profile = { ...base, equipped: { frame: 'frame_neon', title: 'title_novato' } };
    renderTrophies(profile);

    expect(screen.getByText('Marco Neón')).toBeInTheDocument();
    expect(screen.getByText('Novato')).toBeInTheDocument();
  });

  it('lists the purchased inventory and marks the equipped item', () => {
    const base = createEmptyProfile('Ana');
    const profile: Profile = {
      ...base,
      inventory: ['frame_plum', 'title_sabelotodo'],
      equipped: { frame: 'frame_plum' },
    };
    renderTrophies(profile);

    const inventory = screen.getByTestId('inventory');
    expect(inventory).toHaveTextContent('Marco Ciruela');
    expect(inventory).toHaveTextContent('Sabelotodo');
    expect(inventory).toHaveTextContent('equipado');
  });

  it('explains an empty inventory', () => {
    renderTrophies(createEmptyProfile('Ana'));

    expect(screen.getByTestId('empty-inventory')).toHaveTextContent('Todavía no compraste objetos');
  });

  it('links back to the profile selection', () => {
    renderTrophies(createEmptyProfile('Ana'));

    expect(screen.getByRole('link', { name: 'Volver a los perfiles' })).toHaveAttribute(
      'href',
      '/usuarios',
    );
  });
});
