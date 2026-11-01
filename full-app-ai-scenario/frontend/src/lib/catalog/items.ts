export type ItemKind = 'frame' | 'title';

export type ItemUnlock = { type: 'level'; level: number } | { type: 'coins'; price: number };

export type ShopItem = {
  id: string;
  kind: ItemKind;
  name: string;
  description: string;
  icon: string;
  unlock: ItemUnlock;
};

/** Catalog for Phase 2. Level items unlock for free; coin items are bought in the shop. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'frame_neon',
    kind: 'frame',
    name: 'Marco Neón',
    description: 'Marco lima para tu avatar.',
    icon: 'filter_frames',
    unlock: { type: 'level', level: 2 },
  },
  {
    id: 'frame_plum',
    kind: 'frame',
    name: 'Marco Ciruela',
    description: 'Marco morado intenso.',
    icon: 'filter_frames',
    unlock: { type: 'coins', price: 40 },
  },
  {
    id: 'frame_ice',
    kind: 'frame',
    name: 'Marco Glacial',
    description: 'Marco celeste para los cerebros fríos.',
    icon: 'ac_unit',
    unlock: { type: 'level', level: 3 },
  },
  {
    id: 'frame_gold',
    kind: 'frame',
    name: 'Marco Dorado',
    description: 'Marco dorado de campeón.',
    icon: 'filter_frames',
    unlock: { type: 'level', level: 5 },
  },
  {
    id: 'frame_sunset',
    kind: 'frame',
    name: 'Marco Atardecer',
    description: 'Degradé naranja para tu perfil.',
    icon: 'wb_twilight',
    unlock: { type: 'coins', price: 60 },
  },
  {
    id: 'frame_rainbow',
    kind: 'frame',
    name: 'Marco Arcoíris',
    description: 'El marco más llamativo de la tienda.',
    icon: 'palette',
    unlock: { type: 'coins', price: 120 },
  },
  {
    id: 'title_novato',
    kind: 'title',
    name: 'Novato',
    description: 'Título para arrancar.',
    icon: 'local_offer',
    unlock: { type: 'level', level: 1 },
  },
  {
    id: 'title_sabelotodo',
    kind: 'title',
    name: 'Sabelotodo',
    description: 'Título comprable.',
    icon: 'local_offer',
    unlock: { type: 'coins', price: 80 },
  },
  {
    id: 'title_trotamundos',
    kind: 'title',
    name: 'Trotamundos',
    description: 'Para quien no falla geografía.',
    icon: 'public',
    unlock: { type: 'level', level: 3 },
  },
  {
    id: 'title_duelista',
    kind: 'title',
    name: 'Duelista',
    description: 'Título de los que ganan al primer acierto.',
    icon: 'sports_martial_arts',
    unlock: { type: 'level', level: 4 },
  },
  {
    id: 'title_cerebrito',
    kind: 'title',
    name: 'Cerebrito',
    description: 'Título para mentes brillantes.',
    icon: 'psychology',
    unlock: { type: 'coins', price: 60 },
  },
  {
    id: 'title_leyenda',
    kind: 'title',
    name: 'Leyenda',
    description: 'Título para nivel alto.',
    icon: 'local_offer',
    unlock: { type: 'level', level: 8 },
  },
  {
    id: 'title_mitico',
    kind: 'title',
    name: 'Mítico',
    description: 'El título reservado a los elegidos.',
    icon: 'auto_awesome',
    unlock: { type: 'level', level: 10 },
  },
];

export function getItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

/** Tailwind classes that render an equipped frame around an avatar. */
const FRAME_CLASSES: Record<string, string> = {
  frame_neon: 'border-lime-primary',
  frame_plum: 'border-plum',
  frame_ice: 'border-[#7DD3FC]',
  frame_gold: 'border-[#F5C542]',
  frame_sunset: 'border-[#FF8C42]',
  frame_rainbow: 'border-[#9D4EDD]',
};

export function frameClasses(itemId: string | undefined): string {
  if (!itemId) return 'border-lime-primary';
  return FRAME_CLASSES[itemId] ?? 'border-lime-primary';
}
