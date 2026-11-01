import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_PLAYER_NAMES, PLAYER_AVATARS, useGame } from '../../lib/game/GameProvider';
import type { AvatarId } from '../../lib/game/types';
import { frameClasses, getItem } from '../../lib/catalog/items';
import { useProfiles } from '../../lib/profiles/ProfilesProvider';
import ProgressSummary from '../progression/ProgressSummary';

interface PlayerCardProps {
  id: 0 | 1;
  label: string;
  sideLabel: string;
}

const GUEST = '__guest__';
const CREATE = '__create__';

export default function PlayerCard({ id, label, sideLabel }: PlayerCardProps) {
  const { state, setPlayer } = useGame();
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles();
  const player = state.players[id];
  const avatars = PLAYER_AVATARS[id];
  const profile = player.profileId
    ? profiles.find((candidate) => candidate.id === player.profileId)
    : undefined;

  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');

  const equippedFrameId = profile?.equipped.frame;
  const equippedTitleId = profile?.equipped.title;

  // Keep the in-game snapshot in sync when the profile equips something elsewhere.
  useEffect(() => {
    if (!profile) return;
    if (
      player.cosmetics?.frame === equippedFrameId &&
      player.cosmetics?.title === equippedTitleId
    ) {
      return;
    }
    setPlayer(id, {
      name: player.name,
      avatar: player.avatar,
      profileId: profile.id,
      cosmetics: profile.equipped,
    });
  }, [
    profile,
    equippedFrameId,
    equippedTitleId,
    id,
    player.name,
    player.avatar,
    player.cosmetics?.frame,
    player.cosmetics?.title,
    setPlayer,
  ]);

  const handleProfileChange = (value: string) => {
    if (value === CREATE) {
      setCreating(true);
      setDraftName('');
      return;
    }
    setCreating(false);
    if (value === GUEST) {
      setPlayer(id, {
        name: player.name,
        avatar: player.avatar,
        profileId: null,
        cosmetics: null,
      });
      return;
    }
    const chosen = profiles.find((candidate) => candidate.id === value);
    if (!chosen) return;
    setPlayer(id, {
      name: chosen.name,
      avatar: chosen.avatar,
      profileId: chosen.id,
      cosmetics: chosen.equipped,
    });
  };

  const handleCreate = () => {
    const created = createProfile(draftName.trim() || DEFAULT_PLAYER_NAMES[id], player.avatar);
    setCreating(false);
    setDraftName('');
    setPlayer(id, {
      name: created.name,
      avatar: created.avatar,
      profileId: created.id,
      cosmetics: created.equipped,
    });
  };

  const handleNameChange = (name: string) => {
    setPlayer(id, { name, avatar: player.avatar });
    if (player.profileId) updateProfile(player.profileId, { name });
  };

  const handleAvatarSelect = (avatar: AvatarId) => {
    setPlayer(id, { name: player.name, avatar });
    if (player.profileId) updateProfile(player.profileId, { avatar });
  };

  const handleDelete = () => {
    if (!profile) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Eliminar el perfil "${profile.name}"?`)
    ) {
      return;
    }
    deleteProfile(profile.id);
    setPlayer(id, {
      name: player.name,
      avatar: player.avatar,
      profileId: null,
      cosmetics: null,
    });
  };

  const selectValue = profile ? profile.id : GUEST;
  const equippedTitle = profile?.equipped.title ? getItem(profile.equipped.title) : undefined;
  const avatarFrame = frameClasses(profile?.equipped.frame);

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

      <div className="mt-4">
        <label
          htmlFor={`player-${id}-profile`}
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#7A7A7A]"
        >
          Perfil local
        </label>
        <select
          id={`player-${id}-profile`}
          value={selectValue}
          onChange={(event) => handleProfileChange(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-obsidian px-3 py-2 text-sm text-light-text focus:border-lime-primary focus:outline-none"
        >
          <option value={GUEST}>Invitado (sin guardar)</option>
          {profiles.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
          <option value={CREATE}>+ Crear perfil…</option>
        </select>

        {creating && (
          <div className="mt-2 flex gap-2">
            <input
              aria-label={`Nombre del perfil de ${label}`}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={DEFAULT_PLAYER_NAMES[id]}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-obsidian px-3 py-2 text-sm text-light-text placeholder:text-light-text/40 focus:border-lime-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md bg-lime-primary px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel active:scale-95"
            >
              Crear
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center py-6">
        <div
          aria-label={`Avatar de ${label}`}
          className={`mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border-2 bg-obsidian sm:h-28 sm:w-28 ${avatarFrame}`}
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
        {equippedTitle && (
          <span
            data-testid={`equipped-title-${id}`}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-plum bg-[#1a1120] px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider text-lime-pastel"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
              local_offer
            </span>
            {equippedTitle.name}
          </span>
        )}
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

      {profile ? (
        <>
          <ProgressSummary profile={profile} />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <Link
              to={`/trofeos/${profile.id}`}
              className="rounded-lg border border-[#2a2a2a] bg-[#101010] px-2.5 py-1.5 font-display font-semibold uppercase tracking-wider text-[#a0a0a0] transition-all hover:text-light-text"
            >
              Trofeos
            </Link>
            <Link
              to={`/tienda/${profile.id}`}
              className="rounded-lg border border-[#2a2a2a] bg-[#101010] px-2.5 py-1.5 font-display font-semibold uppercase tracking-wider text-[#a0a0a0] transition-all hover:text-light-text"
            >
              Tienda
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-[#E63946]/40 px-2.5 py-1.5 font-display font-semibold uppercase tracking-wider text-[#ff8a94] transition-all hover:bg-[#E63946]/10"
            >
              Eliminar perfil
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-center text-[11px] text-[#777777]">
          Jugando como invitado: no se guardan XP, monedas ni estadísticas.
        </p>
      )}
    </div>
  );
}
