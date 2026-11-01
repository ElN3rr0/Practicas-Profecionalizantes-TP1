import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilesProvider } from '../lib/profiles/ProfilesProvider';
import { createEmptyProfile, PROFILES_STORAGE_KEY, saveProfiles } from '../lib/profiles/storage';
import type { Profile } from '../lib/profiles/types';
import Tienda from './Tienda';

beforeEach(() => {
  localStorage.clear();
});

function renderShop(id: string) {
  return render(
    <ProfilesProvider>
      <MemoryRouter initialEntries={[`/tienda/${id}`]}>
        <Routes>
          <Route path="/tienda/:profileId" element={<Tienda />} />
        </Routes>
      </MemoryRouter>
    </ProfilesProvider>,
  );
}

function readStored(): Profile[] {
  return JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) ?? '[]') as Profile[];
}

describe('Tienda', () => {
  it('buys a coin item and deducts its price', () => {
    const profile: Profile = { ...createEmptyProfile('Ana'), totalCoins: 100 };
    saveProfiles([profile]);
    renderShop(profile.id);

    fireEvent.click(screen.getByRole('button', { name: /Comprar · 40 monedas/ }));

    expect(screen.getByText(/Compraste: Marco Ciruela/)).toBeInTheDocument();
    expect(readStored()[0].totalCoins).toBe(60);
    expect(readStored()[0].inventory).toContain('frame_plum');
  });

  it('disables the buy button when the player cannot afford it', () => {
    const profile: Profile = { ...createEmptyProfile('Ana'), totalCoins: 10 };
    saveProfiles([profile]);
    renderShop(profile.id);

    expect(screen.getByRole('button', { name: /Comprar · 40 monedas/ })).toBeDisabled();
  });

  it('equips and unequips a level-unlocked cosmetic', () => {
    const profile = createEmptyProfile('Ana');
    saveProfiles([profile]);
    renderShop(profile.id);

    fireEvent.click(screen.getByRole('button', { name: 'Equipar' }));
    expect(readStored()[0].equipped.title).toBe('title_novato');
    expect(screen.getByText(/Equipaste: Novato/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desequipar' }));
    expect(readStored()[0].equipped.title).toBeUndefined();
    expect(screen.getByText(/Desequipaste: Novato/)).toBeInTheDocument();
  });

  it('asks to pick a profile when the id is unknown', () => {
    renderShop('missing');

    expect(screen.getByText(/Elegí un perfil/)).toBeInTheDocument();
  });
});
