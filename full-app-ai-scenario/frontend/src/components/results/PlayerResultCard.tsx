import { frameClasses, getItem } from '../../lib/catalog/items';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants/categories';
import { modeAchievement } from '../../lib/game/results';
import { ROUNDS_PER_GAME } from '../../lib/game/rules';
import { WHEEL_CATEGORIES } from '../../lib/game/spin';
import type { GameMode, Player } from '../../lib/game/types';

interface PlayerResultCardProps {
  player: Player;
  mode: GameMode;
  /** Rounds this player won, meaningful in "10 Rondas" mode. */
  roundsWon: number;
  isWinner: boolean;
}

export default function PlayerResultCard({
  player,
  mode,
  roundsWon,
  isWinner,
}: PlayerResultCardProps) {
  const label = player.id === 0 ? 'Jugador 1' : 'Jugador 2';
  const equippedTitle = player.cosmetics?.title ? getItem(player.cosmetics.title) : undefined;
  const avatarBorder = player.cosmetics?.frame
    ? frameClasses(player.cosmetics.frame)
    : isWinner
      ? 'border-lime-primary'
      : 'border-plum';

  return (
    <div
      data-testid={`result-card-${player.id}`}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-surface-card p-5 ${
        isWinner ? 'border-lime-primary/40 shadow-xl' : 'border-plum/70'
      }`}
    >
      {isWinner && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-lime-primary/10 blur-2xl"
        />
      )}

      <div className="flex items-center justify-between border-b border-[#241c2c] pb-3">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-[#a09aa7]">
          {label}
        </span>
        {isWinner ? (
          <span className="rounded-full bg-lime-primary px-2.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-obsidian">
            Ganador
          </span>
        ) : (
          <span className="rounded-full border border-[#33243f] bg-[#201827] px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider text-[#8e8599]">
            Finalista
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 py-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 bg-obsidian ${avatarBorder}`}
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-[28px] ${
              isWinner ? 'text-lime-primary' : 'text-light-text/50'
            }`}
          >
            {player.avatar}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base font-bold tracking-wide text-light-text">
            {player.name}
          </h2>
          <p className="text-[11px] uppercase tracking-wider text-[#7a7280]">
            {modeAchievement(player, mode, roundsWon)}
          </p>
          {equippedTitle && (
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-lime-pastel">
              {equippedTitle.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-[#2e2038] bg-[#100c14] px-3 py-1">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px] text-lime-primary"
          >
            bolt
          </span>
          <span
            data-testid={`result-score-${player.id}`}
            className="font-display text-sm font-bold text-light-text"
          >
            {player.score}
          </span>
          <span className="text-[10px] font-semibold uppercase text-[#666666]">PTS</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7a7280]">
          {mode === 'coronas' ? 'Coronas' : mode === 'rondas' ? 'Rondas ganadas' : 'Aciertos'}
        </span>
        {mode === 'coronas' ? (
          <div className="flex items-center gap-1.5">
            {WHEEL_CATEGORIES.map((category) => {
              const held = player.crowns.includes(category);
              return (
                <span
                  key={category}
                  data-testid={`result-crown-${player.id}-${category}`}
                  aria-label={`${CATEGORY_LABELS[category]}: ${held ? 'conseguida' : 'pendiente'}`}
                  title={CATEGORY_LABELS[category]}
                  className={`h-3.5 w-3.5 rounded-full border ${
                    held ? 'border-white/40' : 'border-white/10'
                  }`}
                  style={{ backgroundColor: held ? CATEGORY_COLORS[category] : 'transparent' }}
                />
              );
            })}
          </div>
        ) : mode === 'rondas' ? (
          <div aria-hidden="true" className="flex items-center gap-1">
            {Array.from({ length: ROUNDS_PER_GAME }, (_, index) => (
              <span
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  index < roundsWon ? 'bg-lime-primary' : 'bg-[#2a2a2a]'
                }`}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[#a09aa7]">
            <span data-testid={`result-correct-${player.id}`}>
              {player.correctAnswers} correctas
            </span>
            <span className="px-1">·</span>
            <span>{player.incorrectAnswers} incorrectas</span>
          </p>
        )}
      </div>
    </div>
  );
}
