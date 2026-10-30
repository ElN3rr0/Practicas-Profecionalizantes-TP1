import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../lib/constants/categories';
import type { CategoryName } from '../../lib/game/types';

const CATEGORY_ORDER: CategoryName[] = [
  'arte',
  'historia',
  'deportes',
  'entretenimiento',
  'geografia',
  'ciencia',
];

export default function CategoryChips() {
  return (
    <div className="mt-10 flex w-full max-w-xl flex-col items-center border-t border-surface-card pt-6">
      <p className="mb-3 text-[11px] uppercase tracking-widest text-light-text/50">
        Categorías de la Ruleta Oficial
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {CATEGORY_ORDER.map((name) => (
          <span
            key={name}
            data-testid="category-chip"
            className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              color: CATEGORY_COLORS[name],
              backgroundColor: `${CATEGORY_COLORS[name]}1A`,
              borderColor: `${CATEGORY_COLORS[name]}4D`,
            }}
          >
            {CATEGORY_LABELS[name]}
          </span>
        ))}
      </div>
    </div>
  );
}
