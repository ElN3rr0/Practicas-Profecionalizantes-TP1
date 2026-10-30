const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

interface AnswerGridProps {
  options: readonly string[];
  selected: number | null;
  eliminated: readonly number[];
  /** True once the question is closed for input (crown choice, resolution in flight). */
  locked: boolean;
  wrongSelection?: boolean;
  onSelect: (index: number) => void;
}

export default function AnswerGrid({
  options,
  selected,
  eliminated,
  locked,
  wrongSelection = false,
  onSelect,
}: AnswerGridProps) {
  return (
    <div className="relative z-10 mb-6 grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2">
      {options.map((option, index) => {
        const isEliminated = eliminated.includes(index);
        const isSelected = selected === index;
        const isWrong = isSelected && wrongSelection;
        const stateClass = isWrong
          ? 'border-[#E63946] bg-[#E63946]/10 opacity-70'
          : isSelected
            ? 'border-lime-primary bg-lime-primary/10 shadow-[0_0_20px_rgba(176,242,128,0.25)]'
            : 'border-[#2e203c] bg-[#1b1424] hover:border-lime-primary/60 hover:bg-[#23192f]';

        return (
          <button
            key={`${OPTION_KEYS[index]}-${option}`}
            type="button"
            data-testid={`answer-option-${index}`}
            aria-pressed={isSelected}
            aria-label={`Opción ${OPTION_KEYS[index]}: ${option}`}
            disabled={locked || isEliminated}
            onClick={() => onSelect(index)}
            className={`group relative flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 disabled:cursor-not-allowed ${
              isEliminated ? 'border-[#241b2c] bg-[#141018] opacity-30' : stateClass
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 font-display text-sm font-extrabold ${
                isSelected ? 'bg-lime-primary text-obsidian' : 'bg-[#281b35] text-lime-pastel'
              }`}
            >
              {OPTION_KEYS[index]}
            </span>
            <span className="font-display text-sm font-semibold text-light-text sm:text-base">
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}
