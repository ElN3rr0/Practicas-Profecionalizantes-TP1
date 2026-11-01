import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LevelUpBanner from '../components/progression/LevelUpBanner';
import ProgressSummary from '../components/progression/ProgressSummary';
import PlayerResultCard from '../components/results/PlayerResultCard';
import WinnerBanner from '../components/results/WinnerBanner';
import { ACHIEVEMENTS } from '../lib/achievements/achievements';
import { playSound } from '../lib/audio';
import { useGame } from '../lib/game/GameProvider';
import { resolveWinner } from '../lib/game/results';
import { seriesChampion } from '../lib/game/rules';
import { levelProgress } from '../lib/progression/levels';
import { useProfiles } from '../lib/profiles/ProfilesProvider';
import type { RewardOutcome } from '../lib/profiles/ProfilesProvider';

function achievementName(id: string): string {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)?.name ?? id;
}

export default function Resultados() {
  const navigate = useNavigate();
  const { state, resetGame, startGame } = useGame();
  const { profiles, deliverGameRewards } = useProfiles();
  const winner = resolveWinner(state);
  const winnerPlayer = winner === null ? null : state.players[winner];
  const [rewards, setRewards] = useState<RewardOutcome[]>([]);

  const tournament = state.config.tournament === true;
  const champion = seriesChampion(state.seriesWins);
  const championPlayer = champion === null ? null : state.players[champion];

  useEffect(() => {
    // Hotseat: the losing player shares this screen, so a declared winner gets the
    // fanfare and the "defeat" tone is reserved for the defensive no-winner state.
    playSound(winner === null ? 'defeat' : 'victory');
  }, [winner]);

  useEffect(() => {
    if (state.status !== 'ended' || !state.gameId) return;
    const outcomes = deliverGameRewards({
      gameId: state.gameId,
      completed: true,
      players: state.players.map((player) => ({
        profileId: player.profileId,
        correctAnswers: player.correctAnswers,
        incorrectAnswers: player.incorrectAnswers,
        bestStreak: player.bestStreak,
        isWinner: winner !== null && winner === player.id,
        // A retiree played, but does not earn the completion bonus.
        completed: state.retiredBy === null || player.id !== state.retiredBy,
      })),
    });
    setRewards(outcomes);
  }, [state.status, state.gameId, state.players, state.retiredBy, winner, deliverGameRewards]);

  useEffect(() => {
    if (rewards.length === 0) return;
    if (rewards.some((outcome) => outcome.levelAfter > outcome.levelBefore)) {
      playSound('level-up');
    }
    if (rewards.some((outcome) => outcome.newAchievements.length > 0)) {
      playSound('achievement');
    }
  }, [rewards]);

  const handlePlayAgain = useCallback(() => {
    if (tournament) {
      // The series keeps its score unless a player already took the trophy.
      startGame({ resetSeries: champion !== null });
      navigate('/ruleta');
      return;
    }
    resetGame();
    navigate('/');
  }, [tournament, champion, startGame, resetGame, navigate]);

  const playAgainLabel = !tournament
    ? 'Jugar de nuevo'
    : champion === null
      ? 'Siguiente partida del torneo'
      : 'Nuevo torneo';

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      <WinnerBanner player={winnerPlayer} mode={state.config.mode} roundWins={state.roundWins} />

      {state.retiredBy !== null && (
        <p
          data-testid="retirement-note"
          className="mt-4 rounded-2xl border border-[#ffb703]/40 bg-[#24132c] px-4 py-3 text-center text-xs text-[#ffd166]"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined mr-1 align-[-3px] text-[15px]"
          >
            logout
          </span>
          {state.players[state.retiredBy].name} se retiró: la victoria es para{' '}
          {state.players[state.retiredBy === 0 ? 1 : 0].name}.
        </p>
      )}

      {tournament && (
        <div
          data-testid="series-score"
          className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-plum/70 bg-[#140e1c] px-4 py-3 text-center"
        >
          <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime-pastel">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              emoji_events
            </span>
            Torneo al mejor de 3
          </span>
          <span className="font-mono text-sm text-light-text">
            {state.seriesWins[0]} — {state.seriesWins[1]}
          </span>
          {championPlayer !== null && (
            <span
              data-testid="series-champion"
              className="rounded-full border border-lime-primary/50 bg-lime-primary/10 px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-wider text-lime-primary"
            >
              ¡{championPlayer.name} gana el torneo!
            </span>
          )}
        </div>
      )}

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

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {state.players.map((player) => {
          const outcome = rewards.find((reward) => reward.profileId === player.profileId);
          const profile = player.profileId
            ? profiles.find((candidate) => candidate.id === player.profileId)
            : undefined;
          const level = profile ? levelProgress(profile.totalXp).level : null;

          return (
            <div
              key={player.id}
              data-testid={`reward-card-${player.id}`}
              className="rounded-2xl border border-plum/70 bg-surface-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-light-text">
                  {player.name}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-lime-pastel">
                  {profile ? `Nivel ${level}` : 'Invitado'}
                </span>
              </div>

              {outcome ? (
                outcome.xp === 0 && outcome.coins === 0 ? (
                  <p
                    className="mt-1 text-xs text-[#777777]"
                    data-testid={`retirement-line-${player.id}`}
                  >
                    Se retiró: sin recompensas de finalización.
                  </p>
                ) : (
                  <p
                    className="mt-1 text-xs text-[#a09aa7]"
                    data-testid={`reward-line-${player.id}`}
                  >
                    +{outcome.xp} XP <span className="px-1">·</span> +{outcome.coins} monedas
                  </p>
                )
              ) : (
                <p className="mt-1 text-xs text-[#777777]">
                  {profile ? 'Recompensas ya registradas.' : 'Invitado: no se guardan recompensas.'}
                </p>
              )}

              {profile && <ProgressSummary profile={profile} />}

              {outcome && outcome.levelAfter > outcome.levelBefore && (
                <LevelUpBanner playerName={player.name} level={outcome.levelAfter} />
              )}

              {outcome && outcome.newAchievements.length > 0 && (
                <p
                  data-testid={`new-achievements-${player.id}`}
                  className="mt-2 rounded-xl border border-[#F5C542]/40 bg-[#F5C542]/5 px-3 py-2 text-[11px] text-[#F5C542]"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined mr-1 align-[-3px] text-[14px]"
                  >
                    workspace_premium
                  </span>
                  Nuevo logro: {outcome.newAchievements.map(achievementName).join(' · ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handlePlayAgain}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-primary px-8 py-4 font-display text-sm font-extrabold uppercase tracking-wider text-obsidian transition-all hover:-translate-y-0.5 hover:bg-lime-pastel active:scale-95 sm:w-auto sm:min-w-[300px] sm:text-base"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            {tournament && champion === null ? 'skip_next' : 'restart_alt'}
          </span>
          <span>{playAgainLabel}</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            arrow_forward
          </span>
        </button>
        <p className="max-w-md text-center text-xs text-light-text/50">
          {tournament && champion === null
            ? 'La serie sigue: se reinicia el tablero y se conserva el marcador del torneo.'
            : 'Se reinicia la partida, pero tus perfiles y su progreso se conservan.'}
        </p>
      </div>
    </section>
  );
}
