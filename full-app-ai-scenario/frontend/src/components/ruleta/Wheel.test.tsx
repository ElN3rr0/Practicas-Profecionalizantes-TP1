import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/constants/categories';
import { WHEEL_CATEGORIES } from '../../lib/game/spin';
import Wheel from './Wheel';

describe('Wheel', () => {
  it('renders six segments, one per canonical category, in canonical order and color', () => {
    render(<Wheel categories={WHEEL_CATEGORIES} rotation={0} />);

    const segments = screen.getAllByTestId('wheel-segment');
    expect(segments).toHaveLength(6);

    const categories = segments.map((segment) => segment.getAttribute('data-category'));
    expect(categories).toEqual([...WHEEL_CATEGORIES]);

    const fills = segments.map((segment) => segment.querySelector('path')?.getAttribute('fill'));
    expect(fills).toEqual(WHEEL_CATEGORIES.map((name) => CATEGORY_COLORS[name]));
  });

  it('labels each segment with its canonical Spanish label and icon', () => {
    render(<Wheel categories={WHEEL_CATEGORIES} rotation={0} />);

    for (const name of WHEEL_CATEGORIES) {
      const segment = screen
        .getAllByTestId('wheel-segment')
        .find((node) => node.getAttribute('data-category') === name);
      expect(segment).toBeDefined();
      expect(segment?.textContent).toContain(CATEGORY_LABELS[name]);
      expect(segment?.textContent).toContain(CATEGORY_ICONS[name]);
    }
  });

  it('applies the current rotation to the wheel surface', () => {
    render(<Wheel categories={WHEEL_CATEGORIES} rotation={90} />);

    expect(screen.getByTestId('roulette-wheel').style.transform).toBe('rotate(90deg)');
  });
});
