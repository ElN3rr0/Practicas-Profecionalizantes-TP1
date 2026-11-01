interface LevelUpBannerProps {
  playerName: string;
  level: number;
}

/** Celebratory banner shown when a profile gains a level after a game. */
export default function LevelUpBanner({ playerName, level }: LevelUpBannerProps) {
  return (
    <div
      role="status"
      data-testid={`level-up-${level}`}
      className="level-up-pop mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-lime-primary bg-lime-primary/10 px-4 py-2.5 text-center"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-lime-primary">
        military_tech
      </span>
      <span className="font-display text-xs font-extrabold uppercase tracking-wider text-lime-primary">
        ¡{playerName} subió al nivel {level}!
      </span>
    </div>
  );
}
