import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuideButton from '../components/guide/GuideButton';
import CategoryChips from '../components/inicio/CategoryChips';
import HolographicDisc from '../components/inicio/HolographicDisc';
import { playSound } from '../lib/audio';

export default function Inicio() {
  const navigate = useNavigate();
  const launchingRef = useRef(false);
  const [rippling, setRippling] = useState(false);

  const handleLaunch = useCallback(() => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setRippling(true);
    navigate('/usuarios');
    playSound('click');
  }, [navigate]);

  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10 text-center sm:px-6">
      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-plum bg-plum/20 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-lime-pastel">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime-primary" />
        MODO 1 VS 1 LOCAL
        <span aria-hidden="true" className="px-1 text-light-text/40">
          •
        </span>
        EDICIÓN ARCADE
      </span>

      <h1 className="font-display text-4xl font-extrabold uppercase leading-tight tracking-tight text-light-text sm:text-6xl">
        ¡A VER SI SABÉS!
      </h1>

      <p className="mx-auto mt-3 max-w-lg text-sm font-normal text-light-text/60 sm:text-base">
        Demuestra quién sabe más en la arena definitiva de trivia. Dos rivales, una misma pantalla y
        6 categorías en juego.
      </p>

      <div className="my-8 sm:my-10">
        <HolographicDisc rippling={rippling} onLaunch={handleLaunch} />
      </div>

      <div className="mt-2 flex w-full flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleLaunch}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-primary px-8 py-4 font-display text-sm font-extrabold uppercase tracking-wider text-obsidian transition-all hover:-translate-y-0.5 hover:bg-lime-pastel active:scale-95 sm:w-auto sm:min-w-[340px] sm:text-base"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            play_circle
          </span>
          <span>Toca el logo o presiona aquí para comenzar</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            arrow_forward
          </span>
        </button>

        <GuideButton
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-plum bg-[#1a1120] px-6 py-3 font-display text-xs font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#241830] active:scale-95 sm:w-auto sm:min-w-[340px]"
          label="Cómo jugar"
        />
      </div>

      <CategoryChips />
    </section>
  );
}
