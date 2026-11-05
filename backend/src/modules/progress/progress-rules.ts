// Pure rules for lesson and course progress (docs/m3-plan.md §4.2).

// A video lesson is complete once this share of it has been watched.
export const VIDEO_COMPLETE_PERCENT = 90;

// A player can report a position slightly past the end of the video.
export const POSITION_TOLERANCE_SECONDS = 5;

// Whole percent watched, 0–100. Callers have already checked duration > 0.
export function videoPercent(positionSeconds: number, durationSeconds: number): number {
  const pct = Math.floor((positionSeconds * 100) / durationSeconds);
  return Math.min(100, Math.max(0, pct));
}

// Rounded down, so it reads 100 only when every lesson is done.
// A course with no lessons has nothing to complete, so it reads 0.
export function courseProgressPercent(completedLessons: number, totalLessons: number): number {
  if (totalLessons <= 0) return 0;
  return Math.min(100, Math.floor((completedLessons * 100) / totalLessons));
}

// Share of numerator / denominator as a whole percent, or null when there is nothing to measure.
export function ratioPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator * 100) / denominator);
}
