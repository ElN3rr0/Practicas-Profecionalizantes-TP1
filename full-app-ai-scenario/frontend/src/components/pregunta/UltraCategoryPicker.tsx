import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import { WHEEL_CATEGORIES } from '../../lib/game/spin';
import type { CategoryName } from '../../lib/game/types';

interface UltraCategoryPickerProps {
  crowns: readonly CategoryName[];
  onPick: (category: CategoryName) => void;
  onCancel: () => void;
}

export default function UltraCategoryPicker({
  crowns,
  onPick,
  onCancel,
}: UltraCategoryPickerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ultra desafío"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border-2 border-[#ffb703]/70 bg-[#15111b] p-6 text-center shadow-[0_0_50px_rgba(255,183,3,0.25)]">
        <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-[#ffb703]">
          local_fire_department
        </span>
        <h2 className="mt-1 font-display text-2xl font-extrabold uppercase text-light-text">
          Ultra Desafío
        </h2>
        <p className="mt-2 text-xs text-[#a09aa7]">
          Elegí una categoría y arriesgá tu racha: si acertás te llevás la corona directa; si
          fallás, perdés el avance de tu racha.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {WHEEL_CATEGORIES.map((category) => {
            const held = crowns.includes(category);
            return (
              <button
                key={category}
                type="button"
                data-testid={`ultra-option-${category}`}
                disabled={held}
                onClick={() => onPick(category)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                  held
                    ? 'cursor-not-allowed border-[#262626] bg-[#141414] opacity-40'
                    : 'border-[#2e203c] bg-[#1b1424] hover:border-[#ffb703]/70 hover:bg-[#23192f]'
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

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 w-full rounded-xl border border-plum bg-[#201827] py-2.5 font-display text-[11px] font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#2b1f35]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
