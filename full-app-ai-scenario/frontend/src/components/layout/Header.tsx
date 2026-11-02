import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '../../lib/audio/useSound';
import GlobalRanking from '../ranking/GlobalRanking';

export default function Header() {
  const navigate = useNavigate();
  const { play, muted, toggleMuted } = useSound();
  const [rankingOpen, setRankingOpen] = useState(false);

  const goHome = useCallback(() => {
    play('click');
    navigate('/');
  }, [navigate, play]);

  const handleMuteToggle = useCallback(() => {
    const unmuting = muted;
    toggleMuted();
    // The cue belongs to the state the user just chose: muting itself stays silent.
    if (unmuting) play('click');
  }, [muted, play, toggleMuted]);

  const openRanking = useCallback(() => {
    play('click');
    setRankingOpen(true);
  }, [play]);

  const closeRanking = useCallback(() => setRankingOpen(false), []);

  return (
    <header className="border-b border-surface bg-obsidian">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 sm:px-8">
        <button
          type="button"
          aria-label="Ir al inicio"
          onClick={goHome}
          className="rounded-control transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-primary"
        >
          <img src="/logo-dashboard.png" alt="" className="h-12 w-auto sm:h-14" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Abrir ranking global"
            aria-haspopup="dialog"
            onClick={openRanking}
            className="flex h-9 items-center gap-1.5 rounded-control border border-surface px-2.5 text-light-text transition-colors hover:bg-surface-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              leaderboard
            </span>
            <span className="hidden font-display text-[11px] font-semibold uppercase tracking-wider sm:inline">
              Ranking
            </span>
          </button>
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

      {rankingOpen && <GlobalRanking onClose={closeRanking} />}
    </header>
  );
}
