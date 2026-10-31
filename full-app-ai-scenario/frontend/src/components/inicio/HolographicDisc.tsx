import { CATEGORY_COLORS } from '../../lib/constants/categories';
import type { CategoryName } from '../../lib/game/types';

const RING_ORDER: CategoryName[] = [
  'arte',
  'historia',
  'deportes',
  'entretenimiento',
  'geografia',
  'ciencia',
];

const SEGMENT_DEGREES = 360 / RING_ORDER.length;
const BEAD_RADIUS_PX = 104;

function buildConicGradient(colors: readonly string[]): string {
  const stops = colors.map((color, index) => {
    const start = index * SEGMENT_DEGREES;
    const end = (index + 1) * SEGMENT_DEGREES;
    return `${color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

const RING_GRADIENT = buildConicGradient(RING_ORDER.map((name) => CATEGORY_COLORS[name]));

interface HolographicDiscProps {
  rippling: boolean;
  onLaunch: () => void;
}

export default function HolographicDisc({ rippling, onLaunch }: HolographicDiscProps) {
  return (
    <button
      type="button"
      aria-label="Toca el logo para comenzar"
      onClick={onLaunch}
      className="group relative cursor-pointer select-none rounded-full bg-transparent p-0"
    >
      {/* Ambient glow behind the wheel. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-plum via-lime-primary to-plum opacity-40 blur-2xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-75 sm:h-[22rem] sm:w-[22rem]"
      />

      {/* Ripple ring, expanded on activation. */}
      <span
        aria-hidden="true"
        data-testid="disc-ripple"
        className={`pointer-events-none absolute inset-0 rounded-full border-2 border-lime-primary/60 opacity-0 ${
          rippling ? 'ripple-active' : ''
        }`}
      />

      {/* Outer six-segment ring, generated from the canonical category colors. */}
      <span
        data-testid="holographic-ring"
        style={{ backgroundImage: RING_GRADIENT }}
        className="animate-spin-slow relative block h-64 w-64 rounded-full p-[3px] shadow-2xl sm:h-80 sm:w-80"
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-obsidian/95 p-2 backdrop-blur-md">
          <span className="relative block h-full w-full rounded-full border border-white/10">
            {RING_ORDER.map((name, index) => (
              <span
                key={name}
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-3.5 w-3.5 rounded-full"
                style={{
                  transform: `translate(-50%, -50%) rotate(${
                    index * SEGMENT_DEGREES + SEGMENT_DEGREES / 2
                  }deg) translateY(-${BEAD_RADIUS_PX}px)`,
                  backgroundColor: CATEGORY_COLORS[name],
                  boxShadow: `0 0 12px ${CATEGORY_COLORS[name]}`,
                }}
              />
            ))}
          </span>
        </span>
      </span>

      {/* Counter-rotating dashed inner ring. */}
      <span
        aria-hidden="true"
        className="animate-spin-reverse pointer-events-none absolute inset-0 m-auto h-52 w-52 rounded-full border border-dashed border-lime-primary/40 sm:h-64 sm:w-64"
      />

      {/* Center logo disc. */}
      <span className="animate-pulse-glow absolute inset-0 m-auto flex h-44 w-44 flex-col items-center justify-center rounded-full border-2 border-lime-primary/70 bg-gradient-to-b from-[#201026] via-[#120a16] to-[#0A0A0A] p-4 transition-all duration-300 group-hover:border-lime-primary sm:h-56 sm:w-56">
        <img
          src="/logo-inicio.png"
          alt=""
          className="mb-2 h-14 w-auto transition-transform duration-300 group-hover:scale-105 sm:h-16"
        />
        <span className="font-display text-xs font-black uppercase tracking-widest text-light-text sm:text-sm">
          A VER SI SABÉS
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-lime-pastel">
          1 VS 1 ARENA
        </span>
      </span>
    </button>
  );
}
