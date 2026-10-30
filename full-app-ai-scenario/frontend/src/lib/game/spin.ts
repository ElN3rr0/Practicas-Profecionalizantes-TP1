import type { CategoryName } from './types';

/**
 * Canonical wheel layout. Segment `i` spans [i * 60°, (i + 1) * 60°) clockwise
 * from the 12-o'clock pointer, so the first entry (`arte`) sits at the top.
 * Order is shared by the wheel SVG and the spin resolver so a reported result
 * always matches the segment the pointer is over.
 */
export const WHEEL_CATEGORIES: readonly CategoryName[] = [
  'arte',
  'historia',
  'deportes',
  'entretenimiento',
  'geografia',
  'ciencia',
];

export const WHEEL_SEGMENT_DEGREES = 360 / WHEEL_CATEGORIES.length;

/** Minimum full turns the wheel completes before settling on a result. */
export const MIN_FULL_TURNS = 5;

/** Settle delay, matched to the wheel's ~4.5s CSS transition. */
export const SPIN_DURATION_MS = 4600;

/** Maps any rotation in degrees to the equivalent angle in [0, 360). */
export function normalizeDegrees(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

/**
 * Resolves the category resting under the 12-o'clock pointer after a final
 * rotation. A clockwise rotation moves the segment whose unrotated start sat at
 * `360 - rotation (mod 360)` up to the pointer; its index selects the category.
 */
export function resolveCategory(
  finalRotation: number,
  categories: readonly CategoryName[] = WHEEL_CATEGORIES,
): CategoryName {
  const pointer = normalizeDegrees(360 - normalizeDegrees(finalRotation));
  const segmentDegrees = 360 / categories.length;
  const index = Math.floor(pointer / segmentDegrees) % categories.length;
  return categories[index];
}

/** Total rotation after a spin: the current angle plus full turns plus a 0–360° offset. */
export function nextRotation(currentRotation: number, randomOffset: number): number {
  return currentRotation + MIN_FULL_TURNS * 360 + normalizeDegrees(randomOffset);
}
