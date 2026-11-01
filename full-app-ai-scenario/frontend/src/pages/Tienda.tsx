import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProgressSummary from '../components/progression/ProgressSummary';
import { SHOP_ITEMS } from '../lib/catalog/items';
import type { ShopItem } from '../lib/catalog/items';
import { levelProgress } from '../lib/progression/levels';
import { useProfiles } from '../lib/profiles/ProfilesProvider';

export default function Tienda() {
  const { profileId = '' } = useParams();
  const { getProfile, buyItem, equipItem, unequip } = useProfiles();
  const profile = getProfile(profileId);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="font-display text-2xl font-extrabold uppercase text-light-text">Tienda</h1>
        <p className="mt-3 text-sm text-[#9A9A9A]">
          Elegí un perfil en la pantalla de jugadores para ver su tienda.
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

  const handleBuy = (item: ShopItem) => {
    const result = buyItem(profile.id, item.id);
    setMessage(result.ok ? `Compraste: ${item.name}` : (result.reason ?? 'No se pudo comprar.'));
  };

  const handleEquip = (item: ShopItem) => {
    const ok = equipItem(profile.id, item.kind, item.id);
    setMessage(ok ? `Equipaste: ${item.name}` : 'Todavía no lo tenés desbloqueado.');
  };

  const handleUnequip = (item: ShopItem) => {
    unequip(profile.id, item.kind);
    setMessage(`Desequipaste: ${item.name}`);
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-light-text">
          Tienda
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
            to={`/trofeos/${profile.id}`}
            className="rounded-xl border border-plum bg-[#1a1120] px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wider text-light-text transition-all hover:bg-[#241830]"
          >
            Sala de Trofeos
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs text-[#9A9A9A]">
        {profile.name} · Nivel {level} · {profile.totalCoins} monedas
      </p>
      <ProgressSummary profile={profile} />
      {message !== null && <p className="mt-3 text-xs text-lime-pastel">{message}</p>}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOP_ITEMS.map((item) => {
          const owned = profile.inventory.includes(item.id);
          const levelUnlocked = item.unlock.type === 'level' && level >= item.unlock.level;
          const unlocked = owned || levelUnlocked;
          const equipped = profile.equipped[item.kind] === item.id;

          return (
            <article
              key={item.id}
              className="flex flex-col rounded-2xl border border-plum/70 bg-surface-card p-4"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[28px] text-lime-primary"
                >
                  {item.icon}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#888888]">
                  {item.kind === 'frame' ? 'Marco' : 'Título'}
                </span>
              </div>
              <h2 className="mt-2 font-display text-sm font-bold text-light-text">{item.name}</h2>
              <p className="text-xs text-[#9A9A9A]">{item.description}</p>
              <div className="mt-3">
                {unlocked ? (
                  equipped ? (
                    <button
                      type="button"
                      onClick={() => handleUnequip(item)}
                      className="w-full rounded-lg border border-lime-primary/50 bg-plum/40 px-3 py-2 font-display text-[11px] font-extrabold uppercase tracking-wider text-lime-primary transition-all hover:bg-plum"
                    >
                      Desequipar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEquip(item)}
                      className="w-full rounded-lg bg-lime-primary px-3 py-2 font-display text-[11px] font-extrabold uppercase tracking-wider text-obsidian transition-all hover:bg-lime-pastel"
                    >
                      Equipar
                    </button>
                  )
                ) : item.unlock.type === 'coins' ? (
                  <button
                    type="button"
                    onClick={() => handleBuy(item)}
                    disabled={profile.totalCoins < item.unlock.price}
                    className="w-full rounded-lg border border-lime-primary/50 bg-plum/40 px-3 py-2 font-display text-[11px] font-extrabold uppercase tracking-wider text-lime-primary transition-all hover:bg-plum disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Comprar · {item.unlock.price} monedas
                  </button>
                ) : (
                  <span className="block rounded-lg border border-[#333333] px-3 py-2 text-center font-display text-[11px] uppercase tracking-wider text-[#777777]">
                    Se desbloquea en nivel {item.unlock.level}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
