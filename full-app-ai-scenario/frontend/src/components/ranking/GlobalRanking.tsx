import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getItem } from '../../lib/catalog/items';
import { levelProgress } from '../../lib/progression/levels';
import { useProfiles } from '../../lib/profiles/ProfilesProvider';
import { rankProfiles } from '../../lib/ranking/ranking';

interface GlobalRankingProps {
  onClose: () => void;
}

const MEDALS: Record<number, { icon: string; className: string }> = {
  0: { icon: 'emoji_events', className: 'text-[#F5C542]' },
  1: { icon: 'emoji_events', className: 'text-[#C0C0C0]' },
  2: { icon: 'emoji_events', className: 'text-[#CD7F32]' },
};

/**
 * Ranking of every locally loaded profile. It reads live provider state, so a profile
 * imported from JSON shows up as soon as the import commits.
 */
export default function GlobalRanking({ onClose }: GlobalRankingProps) {
  const { profiles } = useProfiles();
  const ranked = rankProfiles(profiles);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ranking global de perfiles"
        data-testid="ranking-modal"
        className="w-full max-w-lg overflow-hidden rounded-3xl border-2 border-plum bg-[#15111b] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#2a1d38] bg-[#100b16] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-light-text">
              Ranking global
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[#8e8599]">
              {ranked.length} {ranked.length === 1 ? 'perfil cargado' : 'perfiles cargados'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar ranking"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#33243f] text-[#a09aa7] transition-colors hover:bg-[#241830] hover:text-light-text"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              close
            </span>
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {ranked.length === 0 ? (
            <p
              data-testid="ranking-empty"
              className="rounded-2xl border border-[#2a2a2a] bg-[#101010] px-4 py-6 text-center text-xs text-[#9A9A9A]"
            >
              Todavía no hay perfiles cargados. Creá uno en la pantalla de jugadores o importá un
              JSON para verlo acá.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {ranked.map((profile, index) => {
                const level = levelProgress(profile.totalXp).level;
                const title = profile.equipped.title ? getItem(profile.equipped.title) : undefined;
                const medal = MEDALS[index];

                return (
                  <li
                    key={profile.id}
                    data-testid={`ranking-row-${profile.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[#2a1d38] bg-[#100b16] px-3 py-2.5"
                  >
                    <span
                      aria-label={`Puesto ${index + 1}`}
                      className={`flex w-6 shrink-0 justify-center ${medal?.className ?? 'text-[#8e8599]'}`}
                    >
                      {medal ? (
                        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                          {medal.icon}
                        </span>
                      ) : (
                        <span className="font-mono text-xs">{index + 1}</span>
                      )}
                    </span>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-plum bg-obsidian">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[22px] text-lime-primary"
                      >
                        {profile.avatar}
                      </span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-light-text">
                        {profile.name}
                      </p>
                      <p className="truncate text-[10px] uppercase tracking-wider text-[#8e8599]">
                        Nivel {level}
                        {title ? ` · ${title.name}` : ''}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-lime-pastel">{profile.totalXp} XP</p>
                      <p className="text-[10px] text-[#8e8599]">
                        {profile.stats.wins} victorias · {profile.totalCoins} monedas
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <footer className="border-t border-[#2a1d38] bg-[#100b16] px-5 py-3 text-center">
          <Link
            to="/usuarios"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wider text-lime-pastel transition-colors hover:text-lime-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              group
            </span>
            Gestionar perfiles
          </Link>
        </footer>
      </div>
    </div>
  );
}
