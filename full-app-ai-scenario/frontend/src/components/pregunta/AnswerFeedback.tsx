export type FeedbackKind = 'correct' | 'incorrect' | 'timeout';

interface AnswerFeedbackProps {
  kind: FeedbackKind;
  /** The right answer, shown when the player did not get it. */
  correctAnswer?: string;
  /** Short congratulation / explanation line. */
  detail: string;
  continueLabel: string;
  onContinue: () => void;
}

const TONE: Record<
  FeedbackKind,
  { border: string; glow: string; icon: string; iconColor: string; title: string }
> = {
  correct: {
    border: 'border-lime-primary',
    glow: 'shadow-[0_0_50px_rgba(176,242,128,0.35)]',
    icon: 'check_circle',
    iconColor: 'text-lime-primary',
    title: 'text-lime-primary',
  },
  incorrect: {
    border: 'border-[#E63946]',
    glow: 'shadow-[0_0_50px_rgba(230,57,70,0.35)]',
    icon: 'cancel',
    iconColor: 'text-[#E63946]',
    title: 'text-[#ff8a94]',
  },
  timeout: {
    border: 'border-[#ffb703]',
    glow: 'shadow-[0_0_50px_rgba(255,183,3,0.3)]',
    icon: 'timer_off',
    iconColor: 'text-[#ffb703]',
    title: 'text-[#ffb703]',
  },
};

const TITLE: Record<FeedbackKind, string> = {
  correct: '¡Correcto!',
  incorrect: 'Incorrecto',
  timeout: 'Se acabó el tiempo',
};

export default function AnswerFeedback({
  kind,
  correctAnswer,
  detail,
  continueLabel,
  onContinue,
}: AnswerFeedbackProps) {
  const tone = TONE[kind];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado de la respuesta"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        data-testid="answer-feedback"
        className={`w-full max-w-md rounded-3xl border-2 bg-[#15111b] p-7 text-center ${tone.border} ${tone.glow}`}
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-[56px] ${tone.iconColor}`}
        >
          {tone.icon}
        </span>
        <h2
          className={`mt-1 font-display text-3xl font-extrabold uppercase tracking-tight ${tone.title}`}
        >
          {TITLE[kind]}
        </h2>
        <p className="mt-2 text-sm text-[#c9c3cf]">{detail}</p>

        {kind !== 'correct' && correctAnswer !== undefined && correctAnswer !== '' && (
          <p
            data-testid="feedback-correct-answer"
            className="mt-3 rounded-xl border border-[#2e203c] bg-[#100b16] px-3 py-2 text-xs text-light-text"
          >
            La respuesta correcta era:{' '}
            <span className="font-semibold text-lime-pastel">«{correctAnswer}»</span>
          </p>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-xl bg-lime-primary px-6 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel active:scale-95"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
