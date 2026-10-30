import { DEFAULT_PLAYER_NAMES, PLAYER_AVATARS, useGame } from '../../lib/game/GameProvider';
import type { AvatarId } from '../../lib/game/types';

interface PlayerCardProps {
  id: 0 | 1;
  label: string;
  sideLabel: string;
}

export default function PlayerCard({ id, label, sideLabel }: PlayerCardProps) {
  const { state, setPlayer } = useGame();
  const player = state.players[id];
  const avatars = PLAYER_AVATARS[id];

  const handleNameChange = (name: string) => {
    setPlayer(id, { name, avatar: player.avatar });
  };

  const handleAvatarSelect = (avatar: AvatarId) => {
    setPlayer(id, { name: player.name, avatar });
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-plum/70 bg-surface-card p-6 sm:p-7">
      <header className="flex items-center justify-between border-b border-[#222222] pb-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime-primary" />
          <span className="font-display text-xs font-semibold uppercase tracking-wider text-lime-primary">
            {label}
          </span>
        </div>
        <span className="rounded-md border border-[#262626] bg-[#101010] px-2.5 py-0.5 font-mono text-[11px] text-[#888888]">
          {sideLabel}
        </span>
      </header>

      <div className="flex flex-col items-center py-6">
        <div
          aria-label={`Avatar de ${label}`}
          className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-lime-primary bg-obsidian sm:h-28 sm:w-28"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[42px] text-lime-primary"
          >
            {player.avatar}
          </span>
        </div>

        <label htmlFor={`player-${id}-name`} className="sr-only">
          Nombre de {label}
        </label>
        <input
          id={`player-${id}-name`}
          type="text"
          value={player.name}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder={DEFAULT_PLAYER_NAMES[id]}
          className="w-full max-w-xs rounded-md border border-white/10 bg-obsidian px-3 py-2 text-center text-sm text-light-text placeholder:text-light-text/40 focus:border-lime-primary focus:outline-none"
        />
      </div>

      <div>
        <span className="mb-2.5 block text-[11px] font-medium uppercase tracking-wider text-[#7A7A7A]">
          Seleccionar Avatar
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-[#242424] bg-[#101010] p-1.5">
          {avatars.map((avatar) => {
            const selected = avatar === player.avatar;
            return (
              <button
                key={avatar}
                type="button"
                aria-label={`Seleccionar avatar ${avatar}`}
                aria-pressed={selected}
                onClick={() => handleAvatarSelect(avatar)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                  selected
                    ? 'border-2 border-lime-primary bg-obsidian text-lime-primary'
                    : 'border border-transparent text-[#888888] opacity-60 hover:text-light-text'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  {avatar}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
