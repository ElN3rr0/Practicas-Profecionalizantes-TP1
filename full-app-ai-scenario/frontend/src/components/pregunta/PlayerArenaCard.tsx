import { frameClasses, getItem } from '../../lib/catalog/items';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants/categories';
import { TALLY_TO_EARN_CROWN } from '../../lib/game/rules';
import { WHEEL_CATEGORIES } from '../../lib/game/spin';
import type { GameMode, Player } from '../../lib/game/types';

interface PlayerArenaCardProps {
  player: Player;
  active: boolean;
  /** Crowns are only meaningful in coronas mode; other modes show answer stats. */
  mode?: GameMode;
}

export default function PlayerArenaCard({
  player,
  active,
  mode = 'coronas',
}: PlayerArenaCardProps) {
  const label = player.id === 0 ? 'Jugador 1' : 'Jugador 2';
  const equippedTitle = player.cosmetics?.title ? getItem(player.cosmetics.title) : undefined;
  const avatarBorder = player.cosmetics?.frame
    ? frameClasses(player.cosmetics.frame)
    : active
      ? 'border-lime-primary'
      : 'border-plum';

  return (
    <div
      data-testid={`arena-card-${player.id}`}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-surface-card p-5 sm:p-6 ${
        active ? 'border-lime-primary/40 shadow-xl' : 'border-plum/70'
      }`}
    >
      {active && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-lime-primary/10 blur-2xl" />
      )}

      <div className="flex items-center justify-between border-b border-[#241c2c] pb-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-lime-primary' : 'bg-[#6a5e78]'}`}
          />
          <span
            className={`font-display text-xs font-bold uppercase tracking-wider ${
              active ? 'text-lime-primary' : 'text-[#a09aa7]'
            }`}
          >
            {label}
          </span>
        </div>
        {active ? (
          <span className="rounded-full bg-lime-primary px-2.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-obsidian">
            Tu Turno
          </span>
        ) : (
          <span className="rounded-full border border-[#33243f] bg-[#201827] px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider text-[#8e8599]">
            En Espera
          </span>
        )}
      </div>

      <div className="flex flex-col items-center py-4">
        <div
          className={`mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border-2 bg-obsidian sm:h-24 sm:w-24 ${avatarBorder}`}
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-[38px] ${
              active ? 'text-lime-primary' : 'text-light-text/50'
            }`}
          >
            {player.avatar}
          </span>
        </div>

        <h2 className="font-display text-sm font-bold tracking-wide text-light-text sm:text-base">
          {player.name}
        </h2>

        {equippedTitle && (
          <span
            data-testid={`arena-title-${player.id}`}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-plum bg-[#1a1120] px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-lime-pastel"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[11px]">
              local_offer
            </span>
            {equippedTitle.name}
          </span>
        )}

        <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-[#2e2038] bg-[#100c14] px-3 py-1">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px] text-lime-primary"
          >
            bolt
          </span>
          <span
            data-testid={`arena-score-${player.id}`}
            className="font-display text-sm font-bold text-light-text"
          >
            {player.score}
          </span>
          <span className="text-[10px] font-semibold uppercase text-[#666666]">PTS</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {mode === 'coronas' ? (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7a7280]">
              Coronas
            </span>
            <div className="flex items-center gap-1.5">
              {WHEEL_CATEGORIES.map((category) => {
                const held = player.crowns.includes(category);
                return (
                  <span
                    key={category}
                    data-testid={`crown-${player.id}-${category}`}
                    aria-label={`${CATEGORY_LABELS[category]}: ${held ? 'conseguida' : 'pendiente'}`}
                    title={CATEGORY_LABELS[category]}
                    className={`h-3.5 w-3.5 rounded-full border ${held ? 'border-white/40' : 'border-white/10'}`}
                    style={{ backgroundColor: held ? CATEGORY_COLORS[category] : 'transparent' }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-[#7a7280]">
              Racha de corona:{' '}
              <span className="font-mono text-lime-pastel">
                {player.crownTally}/{TALLY_TO_EARN_CROWN}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7a7280]">
              {mode === 'duelo' ? 'Duelo' : mode === 'contrarreloj' ? 'Contrarreloj' : 'Ronda'}
            </span>
            <span className="text-[10px] text-[#a09aa7]">
              Aciertos: <span className="font-mono text-lime-pastel">{player.correctAnswers}</span>
              <span className="px-1">·</span>
              Racha:{' '}
              <span className="font-mono text-lime-pastel">
                {player.streak}/{player.bestStreak}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
