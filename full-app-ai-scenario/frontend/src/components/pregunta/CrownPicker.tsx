import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import { WHEEL_CATEGORIES } from '../../lib/game/spin';
import type { CategoryName } from '../../lib/game/types';

interface CrownPickerProps {
  crowns: readonly CategoryName[];
  onPick: (category: CategoryName) => void;
}

export default function CrownPicker({ crowns, onPick }: CrownPickerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elegí tu corona"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border-2 border-lime-primary bg-[#15111b] p-6 text-center shadow-[0_0_50px_rgba(176,242,128,0.3)]">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[40px] text-lime-primary"
        >
          workspace_premium
        </span>
        <h2 className="mt-1 font-display text-2xl font-extrabold uppercase text-light-text">
          ¡Corona ganada!
        </h2>
        <p className="mt-2 text-xs text-[#a09aa7]">
          Tres respuestas correctas. Elegí la categoría que querés sumar a tu corona.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {WHEEL_CATEGORIES.map((category) => {
            const held = crowns.includes(category);
            return (
              <button
                key={category}
                type="button"
                data-testid={`crown-option-${category}`}
                disabled={held}
                onClick={() => onPick(category)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                  held
                    ? 'cursor-not-allowed border-[#262626] bg-[#141414] opacity-40'
                    : 'border-[#2e203c] bg-[#1b1424] hover:border-lime-primary/60 hover:bg-[#23192f]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: held ? '#333333' : CATEGORY_COLORS[category] }}
                >
                  <span className="material-symbols-outlined text-[20px] text-white">
                    {CATEGORY_ICONS[category]}
                  </span>
                </span>
                <span className="font-display text-[11px] font-semibold text-light-text">
                  {CATEGORY_LABELS[category]}
                </span>
                {held && (
                  <span className="text-[9px] uppercase tracking-wider text-[#888888]">
                    Ya la tenés
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
