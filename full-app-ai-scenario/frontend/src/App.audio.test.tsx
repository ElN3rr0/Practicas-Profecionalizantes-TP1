import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App, { AppRoutes } from './App';
import { setMuted, unlockAudio } from './lib/audio';
import { GameProvider } from './lib/game/GameProvider';
import { ProfilesProvider } from './lib/profiles/ProfilesProvider';
import { WHEEL_CATEGORIES } from './lib/game/spin';
import { finishedGame } from './test/gameState';
import { drainUnlockListeners, installFakeAudio } from './test/fakeAudio';

/**
 * One fake for the whole file: the first test creates the page's single context and the
 * second reuses it, which is the behaviour a real page has.
 */
const fake = installFakeAudio();

const EVERY_CROWN = [...WHEEL_CATEGORIES];

function renderResults() {
  return render(
    <ProfilesProvider>
      <GameProvider initialState={finishedGame({ crowns: [EVERY_CROWN, []], winner: 0 })}>
        <MemoryRouter initialEntries={['/resultados']}>
          <AppRoutes />
        </MemoryRouter>
      </GameProvider>
    </ProfilesProvider>,
  );
}

afterEach(() => {
  drainUnlockListeners();
});

describe('App audio lifecycle', () => {
  it('constructs no audio context on load and exactly one after the first gesture', () => {
    expect(fake.instances).toHaveLength(0);

    render(<App />);

    expect(screen.getByRole('heading', { name: '¡A VER SI SABÉS!' })).toBeInTheDocument();
    expect(fake.instances).toHaveLength(0);

    fireEvent.pointerDown(document.body);
    expect(fake.instances).toHaveLength(1);

    fireEvent.pointerDown(document.body);
    expect(fake.instances).toHaveLength(1);
  });

  it('keeps the results cues silent while the session is muted, and audible once unmuted', () => {
    unlockAudio();
    const context = fake.instances[0];
    const before = context.oscillators.length;

    setMuted(true);
    const muted = renderResults();
    expect(screen.getByTestId('winner-banner')).toBeInTheDocument();
    expect(context.oscillators.length).toBe(before);

    muted.unmount();
    setMuted(false);
    renderResults();
    expect(context.oscillators.length).toBeGreaterThan(before);
  });
});
