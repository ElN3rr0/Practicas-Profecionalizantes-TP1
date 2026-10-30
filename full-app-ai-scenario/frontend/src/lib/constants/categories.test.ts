import { describe, expect, it } from 'vitest';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from './categories';

describe('CATEGORY_COLORS', () => {
  it('maps all six canonical categories to their canonical colors', () => {
    expect(CATEGORY_COLORS).toEqual({
      arte: '#E63946',
      historia: '#F59E0B',
      deportes: '#FF6B35',
      entretenimiento: '#9D4EDD',
      geografia: '#0077B6',
      ciencia: '#06D6A0',
    });
  });
});

describe('CATEGORY_LABELS', () => {
  it('provides a Spanish label for every category', () => {
    expect(CATEGORY_LABELS.arte).toBe('Arte');
    expect(CATEGORY_LABELS.historia).toBe('Historia');
    expect(CATEGORY_LABELS.deportes).toBe('Deportes');
    expect(CATEGORY_LABELS.entretenimiento).toBe('Entretenimiento');
    expect(CATEGORY_LABELS.geografia).toBe('Geografía');
    expect(CATEGORY_LABELS.ciencia).toBe('Ciencia');
  });
});

describe('CATEGORY_ICONS', () => {
  it('maps every category to a non-empty Material Symbols icon name', () => {
    const names = Object.keys(CATEGORY_COLORS);
    expect(names).toHaveLength(6);
    for (const name of names) {
      expect(CATEGORY_ICONS[name as keyof typeof CATEGORY_ICONS]).toBeTruthy();
    }
  });
});
