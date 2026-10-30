interface FlipperProps {
  spinning: boolean;
}

export default function Flipper({ spinning }: FlipperProps) {
  return (
    <div
      data-testid="roulette-flipper"
      aria-hidden="true"
      className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2"
    >
      <div
        className={`flex flex-col items-center ${spinning ? 'flipper-spin' : ''}`}
        style={{ transformOrigin: 'top center' }}
      >
        <div className="h-4 w-7 rounded-t-sm border border-white bg-gradient-to-b from-[#f2f2f2] to-[#b0b0b0] shadow-md" />
        <div className="-mt-0.5 h-0 w-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-lime-primary drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
        <div className="-mt-4 mb-3 h-2 w-2 rounded-full border border-white/50 bg-obsidian" />
      </div>
    </div>
  );
}
