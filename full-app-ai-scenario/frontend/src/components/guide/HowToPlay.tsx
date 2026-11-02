import { useEffect } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: 'group',
    title: '1. Elegí o creá tu perfil',
    text: 'Cada jugador puede usar un perfil local o jugar como invitado. Los perfiles guardan XP, monedas, estadísticas, insignias y cosméticos en este navegador.',
  },
  {
    icon: 'tune',
    title: '2. Configurá la partida',
    text: 'Elegí el modo, el tiempo por turno, los comodines, el idioma y si querés jugar un torneo al mejor de 3. El orden de inicio se sortea al azar.',
  },
  {
    icon: 'casino',
    title: '3. Girá la ruleta',
    text: 'En cada turno la ruleta elige una de las seis categorías. La pregunta y sus opciones salen siempre de esa categoría.',
  },
  {
    icon: 'quiz',
    title: '4. Respondé la pregunta',
    text: 'Tenés cuatro opciones y el tiempo corre. Acertar suma 100 puntos y alimenta tu racha; fallar pasa el turno al rival.',
  },
  {
    icon: 'workspace_premium',
    title: '5. Sumá coronas o rondas',
    text: 'En 6 Coronas, cada 3 aciertos te dejan elegir una corona y gana quien junta las seis. En 10 Rondas gana quien se lleva más rondas.',
  },
  {
    icon: 'bolt',
    title: '6. Usá los comodines',
    text: '50/50 elimina dos opciones, 2da Chance te da otro intento, +15s suma tiempo, Pasa la pregunta cambia la pregunta y Pista revela una ayuda.',
  },
  {
    icon: 'military_tech',
    title: '7. Ganá recompensas',
    text: 'Al terminar la partida tu perfil gana XP y monedas. Subí de nivel, comprá marcos y títulos en la Tienda y desbloqueá insignias en Trofeos.',
  },
  {
    icon: 'leaderboard',
    title: '8. Mirá el ranking',
    text: 'El botón Ranking del header muestra a todos los perfiles cargados ordenados por experiencia. También aparecen los perfiles importados.',
  },
];

const MODES = [
  {
    icon: 'workspace_premium',
    title: '6 Coronas',
    text: 'El clásico: juntá las seis coronas respondiendo bien.',
  },
  {
    icon: 'military_tech',
    title: '10 Rondas',
    text: 'Diez rondas cara a cara; gana quien se lleva más.',
  },
  {
    icon: 'sports_martial_arts',
    title: 'Duelo Definitivo',
    text: 'El primero que acierta se lleva la partida.',
  },
  {
    icon: 'timer',
    title: 'Contrarreloj',
    text: '90 segundos compartidos; gana quien sume más puntos.',
  },
];

/** Quick reference for new players, opened from the home and setup screens. */
export default function HowToPlay({ onClose }: HowToPlayProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cómo jugar"
        data-testid="how-to-play"
        className="w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-plum bg-[#15111b] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#2a1d38] bg-[#100b16] px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-light-text">
              Cómo jugar
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[#8e8599]">
              Guía rápida de ¡A Ver Si Sabés!
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar guía"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#33243f] text-[#a09aa7] transition-colors hover:bg-[#241830] hover:text-light-text"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              close
            </span>
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <ol className="flex flex-col gap-2.5">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-2xl border border-[#2a1d38] bg-[#100b16] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-plum bg-obsidian text-lime-primary">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                    {step.icon}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold text-light-text">{step.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#a09aa7]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mb-2 mt-5 font-display text-[11px] font-bold uppercase tracking-wider text-lime-pastel">
            Modos de juego
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODES.map((mode) => (
              <div
                key={mode.title}
                className="rounded-xl border border-[#2a1d38] bg-[#100b16] px-3 py-2.5"
              >
                <p className="flex items-center gap-1.5 font-display text-[11px] font-bold text-light-text">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[15px] text-lime-primary"
                  >
                    {mode.icon}
                  </span>
                  {mode.title}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#8e8599]">{mode.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 rounded-xl border border-[#ffb703]/30 bg-[#24132c] px-3 py-2 text-[11px] leading-relaxed text-[#ffd166]">
            <span
              aria-hidden="true"
              className="material-symbols-outlined mr-1 align-[-3px] text-[14px]"
            >
              info
            </span>
            Si te retirás durante una partida, la victoria se le asigna al rival. Los invitados no
            guardan recompensas ni estadísticas.
          </p>
        </div>

        <footer className="border-t border-[#2a1d38] bg-[#100b16] px-5 py-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-lime-primary px-6 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel active:scale-95 sm:w-auto sm:min-w-[220px]"
          >
            ¡Entendido!
          </button>
        </footer>
      </div>
    </div>
  );
}
