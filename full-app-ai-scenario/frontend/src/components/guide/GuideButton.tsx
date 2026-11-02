import { useState } from 'react';
import HowToPlay from './HowToPlay';

interface GuideButtonProps {
  className?: string;
  label?: string;
}

/** Opens the shared how-to-play guide; the caller supplies the visual variant. */
export default function GuideButton({ className = '', label = 'Cómo jugar' }: GuideButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={className}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          menu_book
        </span>
        {label}
      </button>
      {open && <HowToPlay onClose={() => setOpen(false)} />}
    </>
  );
}
