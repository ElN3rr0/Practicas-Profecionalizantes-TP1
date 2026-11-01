import { Link, useParams } from 'react-router-dom';
import ProgressSummary from '../components/progression/ProgressSummary';
import { ACHIEVEMENTS, unlockedAchievements } from '../lib/achievements/achievements';
import { getItem } from '../lib/catalog/items';
import { levelProgress } from '../lib/progression/levels';
import { useProfiles } from '../lib/profiles/ProfilesProvider';

export default function Trofeos() {
  const { profileId = '' } = useParams();
  const { getProfile } = useProfiles();
  const profile = getProfile(profileId);

  if (!profile) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-display text-2xl font-extrabold uppercase text-light-text">
          Sala de Trofeos
        </h1>
        <p className="mt-3 text-sm text-[#9A9A9A]">
          Elegí un perfil en la pantalla de jugadores para ver sus trofeos.
        </p>
        <Link
          to="/usuarios"
          className="mt-5 inline-block rounded-xl bg-lime-primary px-5 py-3 font-display text-xs font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel"
        >
          Volver a jugadores
        </Link>
      </section>
    );
  }

  const level = levelProgress(profile.totalXp).level;
  const unlocked = new Set(unlockedAchievements(profile).map((achievement) => achievement.id));
  const frame = profile.equipped.frame ? getItem(profile.equipped.frame) : undefined;
  const title = profile.equipped.title ? getItem(profile.equipped.title) : undefined;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-light-text">
          Sala de Trofeos
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/usuarios"
            className="flex items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#101010] px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0] transition-all hover:text-light-text"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              group
            </span>
            Volver a los perfiles
          </Link>
          <Link
            to={`/tienda/${profile.id}`}
            className="rounded-xl border border-plum bg-[#1a1120] px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#241830]"
          >
            Tienda
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs text-[#9A9A9A]">
        {profile.name} · Nivel {level} · {unlocked.size} / {ACHIEVEMENTS.length} insignias
      </p>
      <ProgressSummary profile={profile} />

      <h2 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-lime-pastel">
        Insignias y logros
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id);
          return (
            <div
              key={achievement.id}
              data-testid={`achievement-${achievement.id}`}
              className={`flex items-start gap-2 rounded-xl border p-3 ${
                isUnlocked
                  ? 'border-lime-primary/50 bg-lime-primary/5'
                  : 'border-[#2a2a2a] bg-[#101010] opacity-60'
              }`}
            >
              <span
                aria-hidden="true"
                className={`material-symbols-outlined text-[24px] ${
                  isUnlocked ? 'text-lime-primary' : 'text-[#666666]'
                }`}
              >
                {achievement.icon}
              </span>
              <div>
                <p className="font-display text-xs font-bold text-light-text">{achievement.name}</p>
                <p className="text-[11px] text-[#9A9A9A]">{achievement.description}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#777777]">
                  {isUnlocked ? 'Desbloqueada' : 'Bloqueada'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-lime-pastel">
        Equipado
      </h2>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#a09aa7]">
        <span className="rounded-xl border border-[#2a2a2a] bg-[#101010] px-3 py-2">
          Marco: <span className="text-light-text">{frame?.name ?? 'Ninguno'}</span>
        </span>
        <span className="rounded-xl border border-[#2a2a2a] bg-[#101010] px-3 py-2">
          Título: <span className="text-light-text">{title?.name ?? 'Ninguno'}</span>
        </span>
        <span className="rounded-xl border border-[#2a2a2a] bg-[#101010] px-3 py-2">
          Objetos comprados: <span className="text-light-text">{profile.inventory.length}</span>
        </span>
      </div>

      <h2 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-lime-pastel">
        Inventario
      </h2>
      {profile.inventory.length === 0 ? (
        <p className="mt-3 text-xs text-[#777777]" data-testid="empty-inventory">
          Todavía no compraste objetos. Pasá por la tienda para sumar marcos y títulos.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2" data-testid="inventory">
          {profile.inventory.map((itemId) => {
            const item = getItem(itemId);
            if (!item) return null;
            const isEquipped = profile.equipped[item.kind] === item.id;
            return (
              <span
                key={itemId}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs ${
                  isEquipped
                    ? 'border-lime-primary/50 bg-lime-primary/10 text-lime-pastel'
                    : 'border-[#2a2a2a] bg-[#101010] text-[#a09aa7]'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  {item.icon}
                </span>
                {item.name}
                {isEquipped && <span className="text-[9px] uppercase">equipado</span>}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
