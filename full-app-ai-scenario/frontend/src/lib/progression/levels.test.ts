import { describe, expect, it } from 'vitest';
import { levelProgress, totalXpForLevel, xpForLevel } from './levels';

describe('xpForLevel', () => {
  it('follows the configured curve (100, 150, 200...)', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(150);
    expect(xpForLevel(3)).toBe(200);
    expect(xpForLevel(4)).toBe(250);
  });
});

describe('totalXpForLevel', () => {
  it('accumulates the thresholds', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(250);
    expect(totalXpForLevel(4)).toBe(450);
  });
});

describe('levelProgress', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelProgress(0)).toMatchObject({
      level: 1,
      xpIntoLevel: 0,
      xpForNext: 100,
      ratio: 0,
      xpToNext: 100,
    });
  });

  it('levels up exactly at the cumulative thresholds', () => {
    expect(levelProgress(99).level).toBe(1);
    expect(levelProgress(100).level).toBe(2);
    expect(levelProgress(249).level).toBe(2);
    expect(levelProgress(250).level).toBe(3);
    expect(levelProgress(450).level).toBe(4);
  });

  it('reports progress inside the level', () => {
    const progress = levelProgress(120);
    expect(progress.level).toBe(2);
    expect(progress.xpIntoLevel).toBe(20);
    expect(progress.xpForNext).toBe(150);
    expect(progress.ratio).toBeCloseTo(20 / 150);
    expect(progress.xpToNext).toBe(130);
  });

  it('clamps negative and invalid input', () => {
    expect(levelProgress(-50).level).toBe(1);
    expect(levelProgress(Number.NaN).level).toBe(1);
  });
});
