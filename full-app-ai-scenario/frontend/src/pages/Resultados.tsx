import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerResultCard from '../components/results/PlayerResultCard';
import WinnerBanner from '../components/results/WinnerBanner';
import { playSound } from '../lib/audio';
import { useGame } from '../lib/game/GameProvider';
import { resolveWinner } from '../lib/game/results';

export default function Resultados() {
  const navigate = useNavigate();
  const { state, resetGame } = useGame();
  const winner = resolveWinner(state);
  const winnerPlayer = winner === null ? null : state.players[winner];

  useEffect(() => {
    // Hotseat: the losing player shares this screen, so a declared winner gets the
    // fanfare and the "defeat" tone is reserved for the defensive no-winner state.
    playSound(winner === null ? 'defeat' : 'victory');
  }, [winner]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    navigate('/');
  }, [resetGame, navigate]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      <WinnerBanner player={winnerPlayer} mode={state.config.mode} roundWins={state.roundWins} />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlayerResultCard
          player={state.players[0]}
          mode={state.config.mode}
          roundsWon={state.roundWins[0]}
          isWinner={winner === 0}
        />
        <PlayerResultCard
          player={state.players[1]}
          mode={state.config.mode}
          roundsWon={state.roundWins[1]}
          isWinner={winner === 1}
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handlePlayAgain}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-primary px-8 py-4 font-display text-sm font-extrabold uppercase tracking-wider text-obsidian transition-all hover:-translate-y-0.5 hover:bg-lime-pastel active:scale-95 sm:w-auto sm:min-w-[300px] sm:text-base"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            restart_alt
          </span>
          <span>Jugar de nuevo</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            arrow_forward
          </span>
        </button>
        <p className="max-w-md text-center text-xs text-light-text/50">
          Se borran los nombres, las coronas y los puntos para empezar una partida desde cero.
        </p>
      </div>
    </section>
  );
}
