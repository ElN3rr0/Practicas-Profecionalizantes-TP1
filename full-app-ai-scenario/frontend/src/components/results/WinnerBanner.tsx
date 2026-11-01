import Confetti from '../effects/Confetti';
import { frameClasses, getItem } from '../../lib/catalog/items';
import { MODE_LABELS, modeAchievement } from '../../lib/game/results';
import type { GameMode, Player } from '../../lib/game/types';

interface WinnerBannerProps {
  /** The declared winner, or `null` when the game has no decided champion. */
  player: Player | null;
  mode: GameMode;
  roundWins: readonly [number, number];
}

const MODE_ICONS: Record<GameMode, string> = {
  coronas: 'workspace_premium',
  rondas: 'military_tech',
  duelo: 'sports_martial_arts',
  contrarreloj: 'timer',
};

export default function WinnerBanner({ player, mode, roundWins }: WinnerBannerProps) {
  if (player === null) {
    return (
      <div
        data-testid="winner-banner"
        className="rounded-2xl border border-plum/70 bg-surface-card px-6 py-10 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#33243f] bg-obsidian">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[32px] text-[#6a5e78]"
            >
              emoji_events
            </span>
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-light-text sm:text-3xl">
            Todavía no hay ganador
          </h1>
          <p className="max-w-md text-sm text-light-text/60">
            Terminá una partida para coronar al campeón, o empezá un juego nuevo cuando quieras.
          </p>
        </div>
      </div>
    );
  }

  const equippedTitle = player.cosmetics?.title ? getItem(player.cosmetics.title) : undefined;

  return (
    <div
      data-testid="winner-banner"
      className="relative overflow-hidden rounded-2xl border border-lime-primary/40 bg-surface-card px-6 py-8 text-center sm:px-10 sm:py-10"
    >
      <Confetti />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-lime-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-12 h-44 w-44 rounded-full bg-plum/70 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-plum bg-plum/25 px-3.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-lime-pastel">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            flag
          </span>
          Fin de la partida • {MODE_LABELS[mode]}
        </span>

        <div
          className={`victory-glow flex h-20 w-20 items-center justify-center rounded-2xl border-2 bg-obsidian sm:h-24 sm:w-24 ${
            player.cosmetics?.frame ? frameClasses(player.cosmetics.frame) : 'border-lime-primary'
          }`}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[40px] text-lime-primary sm:text-[46px]"
          >
            {player.avatar}
          </span>
        </div>

        <h1
          data-testid="winner-name"
          className="font-display text-3xl font-extrabold uppercase tracking-tight text-lime-primary sm:text-5xl"
        >
          ¡Gana {player.name}!
        </h1>

        {equippedTitle !== undefined && (
          <span
            data-testid="winner-title"
            className="inline-flex items-center gap-1 rounded-full border border-plum bg-[#1a1120] px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-wider text-lime-pastel"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
              local_offer
            </span>
            {equippedTitle.name}
          </span>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-plum bg-plum/40 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-lime-pastel">
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
              {MODE_ICONS[mode]}
            </span>
            {modeAchievement(player, mode, roundWins[player.id])}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[#2e2038] bg-[#100c14] px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-light-text">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[15px] text-lime-primary"
            >
              bolt
            </span>
            {player.score} PTS
          </span>
        </div>
      </div>
    </div>
  );
}
