import type { ReactNode } from 'react';

interface FeedbackProps {
  tone: 'wrong' | 'info';
  children: ReactNode;
}

const TONE_CLASSES: Record<FeedbackProps['tone'], string> = {
  wrong: 'border-[#E63946]/60 bg-[#E63946]/10 text-[#ffd9dc]',
  info: 'border-lime-primary/50 bg-lime-primary/10 text-lime-pastel',
};

export default function Feedback({ tone, children }: FeedbackProps) {
  return (
    <div
      role="status"
      data-testid={`feedback-${tone}`}
      className={`mb-4 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-center font-display text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
        {tone === 'wrong' ? 'error' : 'info'}
      </span>
      {children}
    </div>
  );
}
