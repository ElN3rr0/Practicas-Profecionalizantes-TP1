import { frameClasses, getItem } from '../../lib/catalog/items';
import { useGame } from '../../lib/game/GameProvider';

interface PlayerStatusCardProps {
  id: 0 | 1;
  active: boolean;
}

export default function PlayerStatusCard({ id, active }: PlayerStatusCardProps) {
  const { state } = useGame();
  const player = state.players[id];
  const label = id === 0 ? 'Jugador 1' : 'Jugador 2';
  const equippedTitle = player.cosmetics?.title ? getItem(player.cosmetics.title) : undefined;
  const avatarBorder = player.cosmetics?.frame
    ? frameClasses(player.cosmetics.frame)
    : active
      ? 'border-lime-primary'
      : 'border-plum';

  return (
    <div
      data-testid={`player-card-${id}`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface-card p-5 sm:p-6 ${
        active ? 'border-lime-primary/40 shadow-xl' : 'border-plum/70'
      }`}
    >
      {active && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-lime-primary/10 blur-2xl" />
      )}

      <div className="flex items-center justify-between border-b border-[#222222] pb-3">
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
          <span className="rounded-full bg-lime-primary px-2.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-obsidian shadow-sm">
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
          className={`mb-3 flex h-24 w-24 items-center justify-center rounded-2xl border-2 bg-obsidian sm:h-28 sm:w-28 ${avatarBorder}`}
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-[42px] ${
              active ? 'text-lime-primary' : 'text-light-text/60'
            }`}
          >
            {player.avatar}
          </span>
        </div>

        <h2 className="font-display text-base font-bold tracking-wide text-light-text">
          {player.name}
        </h2>

        {equippedTitle && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-plum bg-[#1a1120] px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-lime-pastel">
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
          <span className="font-display text-sm font-bold text-light-text">{player.score}</span>
          <span className="text-[10px] font-semibold uppercase text-[#666666]">PTS</span>
        </div>
      </div>
    </div>
  );
}
