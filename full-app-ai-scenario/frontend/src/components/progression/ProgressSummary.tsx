import { levelProgress } from '../../lib/progression/levels';
import { accuracyPercent } from '../../lib/progression/stats';
import type { Profile } from '../../lib/profiles/types';

interface ProgressSummaryProps {
  profile: Profile;
}

/** Compact level / XP bar / coins block, shared by the setup and results screens. */
export default function ProgressSummary({ profile }: ProgressSummaryProps) {
  const progress = levelProgress(profile.totalXp);
  const percent = Math.round(progress.ratio * 100);

  return (
    <div
      data-testid={`progress-summary-${profile.id}`}
      className="mt-3 rounded-xl border border-[#242424] bg-[#101010] p-3"
    >
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
        <span>Nivel {progress.level}</span>
        <span className="flex items-center gap-1 text-lime-pastel" data-testid="coin-balance">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            paid
          </span>
          {profile.totalCoins}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1c1b1b]"
        role="progressbar"
        aria-label="Progreso de nivel"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          data-testid="xp-bar"
          className="h-full rounded-full bg-gradient-to-r from-plum to-lime-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[#666666]">
        <span>
          {progress.xpIntoLevel} / {progress.xpForNext} XP
        </span>
        <span>
          {progress.ratio >= 1 ? '¡Nivel completo!' : `${progress.xpToNext} XP para subir`}
        </span>
      </div>

      <div
        data-testid="profile-stats"
        className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[#242424] pt-2 text-[10px] text-[#888888]"
      >
        <span>
          Partidas: <span className="text-light-text">{profile.stats.gamesPlayed}</span>
        </span>
        <span>
          Victorias: <span className="text-light-text">{profile.stats.wins}</span>
        </span>
        <span>
          Aciertos: <span className="text-light-text">{accuracyPercent(profile.stats)}%</span>
        </span>
        <span>
          Mejor racha: <span className="text-light-text">{profile.stats.bestStreak}</span>
        </span>
      </div>
    </div>
  );
}
