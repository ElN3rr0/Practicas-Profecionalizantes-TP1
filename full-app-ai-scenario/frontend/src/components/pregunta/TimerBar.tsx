interface TimerBarProps {
  remaining: number;
  total: number;
}

export default function TimerBar({ remaining, total }: TimerBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const percent = Math.max(0, Math.min(100, (remaining / safeTotal) * 100));

  return (
    <div className="relative z-10 mt-3 flex flex-col gap-2">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 rounded-xl border border-plum bg-[#100b16] px-3.5 py-1.5">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[18px] text-lime-primary"
          >
            timer
          </span>
          <div className="flex items-baseline gap-1">
            <span
              data-testid="countdown"
              className="font-mono text-xl font-extrabold text-lime-primary"
            >
              {remaining}
            </span>
            <span className="font-mono text-[10px] uppercase text-[#8e8599]">seg</span>
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Tiempo restante"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={remaining}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#1b1424]"
      >
        <div
          data-testid="timer-bar"
          className="h-full rounded-full bg-gradient-to-r from-lime-primary to-[#E63946] transition-all duration-1000"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
