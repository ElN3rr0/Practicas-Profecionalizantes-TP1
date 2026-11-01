import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../lib/game/GameProvider';
import { CONTRARRELOJ_SECONDS } from '../../lib/game/rules';

const GAME_PATHS = new Set(['/ruleta', '/pregunta']);

/**
 * Drives the shared contrarreloj clock and sends the players to the results screen
 * when it reaches zero. Rendered by the app shell so the clock keeps running across
 * the wheel and the question screen; it is inert in every other mode.
 */
export default function GameClock() {
  const { state, tick } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const enabled = state.config.mode === 'contrarreloj';
  const running = enabled && state.status !== 'setup' && state.status !== 'ended';

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(id);
  }, [running, tick]);

  useEffect(() => {
    if (!enabled || state.status !== 'ended') return;
    if (GAME_PATHS.has(location.pathname)) navigate('/resultados');
  }, [enabled, state.status, location.pathname, navigate]);

  if (!running) return null;

  const urgent = state.clock <= 15;
  const ratio = Math.max(0, Math.min(1, state.clock / CONTRARRELOJ_SECONDS));

  return (
    <div className="sticky top-0 z-40 flex justify-center bg-surface/85 px-4 py-2 backdrop-blur">
      <div
        data-testid="game-clock"
        role="timer"
        aria-label={`Contrarreloj: quedan ${state.clock} segundos`}
        className={`flex w-full max-w-sm flex-col gap-1 rounded-xl border px-4 py-2 ${
          urgent ? 'border-[#E63946]/60 bg-[#2a0f14]' : 'border-plum bg-[#140e1c]'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
          <span className={urgent ? 'text-[#ff8a94]' : 'text-lime-pastel'}>Contrarreloj</span>
          <span className={`font-mono text-sm ${urgent ? 'text-[#ff8a94]' : 'text-light-text'}`}>
            {state.clock}s
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              urgent ? 'bg-[#E63946]' : 'bg-gradient-to-r from-plum to-lime-primary'
            }`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
