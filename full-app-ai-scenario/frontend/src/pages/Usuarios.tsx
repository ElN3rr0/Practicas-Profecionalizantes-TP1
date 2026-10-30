import { useNavigate } from 'react-router-dom';
import GameConfigPanel from '../components/usuarios/GameConfigPanel';
import PlayerCard from '../components/usuarios/PlayerCard';
import { playSound } from '../lib/audio';
import { useGame } from '../lib/game/GameProvider';

export default function Usuarios() {
  const navigate = useNavigate();
  const { startGame } = useGame();

  const handleStart = () => {
    if (!startGame()) return;
    navigate('/ruleta');
    playSound('click');
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-plum bg-plum/20 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-lime-pastel">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime-primary" />
          Modo Cara a Cara
        </span>
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-light-text sm:text-5xl">
          ¡A Ver Si Sabés!
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-normal text-light-text/60 sm:text-base">
          Compite cara a cara en la misma pantalla. Elige tu rival, configura las reglas y domina el
          tablero.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlayerCard id={0} label="Jugador 1" sideLabel="Lado Izquierdo" />
        <PlayerCard id={1} label="Jugador 2" sideLabel="Lado Derecho" />
      </div>

      <div className="mt-6">
        <GameConfigPanel />
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-primary px-8 py-4 font-display text-sm font-extrabold uppercase tracking-wider text-obsidian transition-all hover:-translate-y-0.5 hover:bg-lime-pastel active:scale-95 sm:w-auto sm:min-w-[340px] sm:text-base"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            play_arrow
          </span>
          <span>Comenzar</span>
        </button>
        <p className="text-center text-xs text-light-text/50">
          El orden de tiro de ruleta se asignará al azar al iniciar la partida.
        </p>
      </div>
    </section>
  );
}
