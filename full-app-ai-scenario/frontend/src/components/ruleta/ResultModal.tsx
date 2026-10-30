import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import type { CategoryName } from '../../lib/game/types';

interface ResultModalProps {
  category: CategoryName;
  playerName: string;
  onPlay: () => void;
  onRespin: () => void;
}

export default function ResultModal({ category, playerName, onPlay, onRespin }: ResultModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado de la ruleta"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-lime-primary bg-[#15111b] p-6 text-center shadow-[0_0_50px_rgba(176,242,128,0.3)] sm:p-7">
        <div
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
          style={{ backgroundColor: CATEGORY_COLORS[category] }}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-white">
            {CATEGORY_ICONS[category]}
          </span>
        </div>

        <span className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-lime-primary">
          ¡Categoría Seleccionada!
        </span>
        <h3 className="mb-2 font-display text-2xl font-extrabold uppercase text-light-text sm:text-3xl">
          {CATEGORY_LABELS[category]}
        </h3>
        <p className="mb-6 text-xs text-[#a09aa7]">
          {playerName} responderá la pregunta por 30 puntos o corona directa.
        </p>

        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-lime-primary py-3 font-display text-xs font-bold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel"
          >
            Jugar Pregunta
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </button>
          <button
            type="button"
            onClick={onRespin}
            className="w-full rounded-xl border border-plum bg-[#201827] py-3 font-display text-xs font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#2b1f35]"
          >
            Girar de Nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
