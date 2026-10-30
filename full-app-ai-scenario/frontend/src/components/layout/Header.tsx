import { useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSound } from '../../lib/audio/useSound';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio' },
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/ruleta', label: 'Ruleta' },
  { to: '/pregunta', label: 'Pregunta' },
  { to: '/resultados', label: 'Resultados' },
];

export default function Header() {
  const { play, muted, toggleMuted } = useSound();

  const handleMuteToggle = useCallback(() => {
    const unmuting = muted;
    toggleMuted();
    // The cue belongs to the state the user just chose: muting itself stays silent.
    if (unmuting) play('click');
  }, [muted, play, toggleMuted]);

  return (
    <header className="border-b border-surface bg-obsidian">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-plum font-display text-sm font-bold text-lime-primary">
            VS
          </span>
          <span className="font-display text-lg font-semibold text-light-text">A Ver Si Sabés</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label="Navegación principal">
            <ul className="flex flex-wrap items-center gap-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => play('click')}
                    className={({ isActive }) =>
                      `rounded-control px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-lime-primary text-obsidian'
                          : 'text-light-text hover:bg-surface-card'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            aria-label="Silenciar sonidos"
            aria-pressed={muted}
            onClick={handleMuteToggle}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-surface text-light-text transition-colors hover:bg-surface-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              {muted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
