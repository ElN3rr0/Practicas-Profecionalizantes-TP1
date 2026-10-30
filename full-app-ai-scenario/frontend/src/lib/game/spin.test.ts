import { describe, expect, it } from 'vitest';
import {
  MIN_FULL_TURNS,
  nextRotation,
  normalizeDegrees,
  resolveCategory,
  WHEEL_CATEGORIES,
  WHEEL_SEGMENT_DEGREES,
} from './spin';
import type { CategoryName } from './types';

describe('WHEEL_CATEGORIES', () => {
  it('lays out the six canonical categories in canonical order', () => {
    expect(WHEEL_CATEGORIES).toEqual([
      'arte',
      'historia',
      'deportes',
      'entretenimiento',
      'geografia',
      'ciencia',
    ]);
    expect(WHEEL_SEGMENT_DEGREES).toBe(60);
  });
});

describe('normalizeDegrees', () => {
  it('maps any rotation into [0, 360)', () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(359)).toBe(359);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(720)).toBe(0);
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(-360)).toBe(0);
  });
});

describe('resolveCategory', () => {
  it('returns the category under the pointer for a representative rotation per segment', () => {
    const cases: Array<[number, CategoryName]> = [
      [0, 'arte'],
      [270, 'historia'],
      [210, 'deportes'],
      [150, 'entretenimiento'],
      [90, 'geografia'],
      [30, 'ciencia'],
    ];

    for (const [rotation, expected] of cases) {
      expect(resolveCategory(rotation), `rotation ${rotation}`).toBe(expected);
    }
  });

  it('is invariant under whole turns', () => {
    expect(resolveCategory(1800)).toBe(resolveCategory(0));
    expect(resolveCategory(5 * 360 + 90)).toBe(resolveCategory(90));
  });

  it('resolves boundary rotations to a defined segment', () => {
    expect(resolveCategory(60)).toBe('ciencia');
    expect(resolveCategory(359)).toBe('arte');
  });
});

describe('nextRotation', () => {
  it('adds the minimum full turns plus a clamped offset', () => {
    expect(nextRotation(0, 0)).toBe(MIN_FULL_TURNS * 360);
    expect(nextRotation(0, 30)).toBe(MIN_FULL_TURNS * 360 + 30);
    expect(nextRotation(0, 359)).toBe(MIN_FULL_TURNS * 360 + 359);
    expect(nextRotation(720, 90)).toBe(720 + MIN_FULL_TURNS * 360 + 90);
  });

  it('always advances by at least the minimum full turns', () => {
    const start = 1234;
    const next = nextRotation(start, 400);
    expect(next - start).toBeGreaterThanOrEqual(MIN_FULL_TURNS * 360);
  });
});
