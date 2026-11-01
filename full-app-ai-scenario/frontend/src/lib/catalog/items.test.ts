import { describe, expect, it } from 'vitest';
import { frameClasses, getItem, SHOP_ITEMS } from './items';

describe('shop catalog', () => {
  it('uses unique ids and non-empty names', () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHOP_ITEMS.every((item) => item.name.length > 0)).toBe(true);
  });

  it('pins positive unlock values', () => {
    for (const item of SHOP_ITEMS) {
      if (item.unlock.type === 'level') expect(item.unlock.level).toBeGreaterThanOrEqual(1);
      else expect(item.unlock.price).toBeGreaterThan(0);
    }
  });

  it('offers both level and coin unlocks for frames and titles', () => {
    for (const kind of ['frame', 'title'] as const) {
      const items = SHOP_ITEMS.filter((item) => item.kind === kind);
      expect(items.some((item) => item.unlock.type === 'level')).toBe(true);
      expect(items.some((item) => item.unlock.type === 'coins')).toBe(true);
    }
  });

  it('looks items up by id', () => {
    expect(getItem('frame_gold')?.name).toBe('Marco Dorado');
    expect(getItem('missing')).toBeUndefined();
  });

  it('maps frames to border classes with a safe fallback', () => {
    expect(frameClasses('frame_gold')).toBe('border-[#F5C542]');
    expect(frameClasses('unknown')).toBe('border-lime-primary');
    expect(frameClasses(undefined)).toBe('border-lime-primary');
  });
});
