// Long-term volume progression — the slow, multi-year climb.
//
// The per-BLOCK target (norwegian.ts) shapes a single 4-week mesocycle: ramp
// the runner up to ~+20% then deload. This module handles the BETWEEN-block
// creep: each completed block nudges the persisted baseline up a little, so a
// 30 km/week runner can reach ~90 km over a few years. Crucially the rate only
// *slows* as mileage rises — it is never clamped to a fixed ceiling, so volume
// keeps growing across months and years.

/**
 * Per-block baseline growth factor. Lower-mileage runners add proportionally
 * more; high-mileage runners creep up slowly — but the factor stays above 1.0
 * at every volume, so there is no absolute long-term cap.
 */
export function baselineAdvanceFactor(currentWeeklyKm: number): number {
  const km = currentWeeklyKm;
  if (km < 40) return 1.045;
  if (km < 55) return 1.04;
  if (km < 70) return 1.035;
  if (km < 85) return 1.03;
  if (km < 100) return 1.025;
  if (km < 120) return 1.02;
  if (km < 150) return 1.015;
  return 1.01;
}

/**
 * The training baseline for the NEXT block, given the baseline just trained
 * and how much of the last block the runner actually completed:
 *   - solid adherence (>= 70%): advance by the (slowing, uncapped) factor
 *   - partial (40-70%):         hold — consolidate before adding more
 *   - poor (< 40%):             gentle detrain, so we never ramp on top of
 *                               work that wasn't done
 * No upper bound — sustained training keeps lifting the baseline.
 */
export function nextTrainingBaseline(currentWeeklyKm: number, adherenceRatio: number): number {
  if (adherenceRatio >= 0.7) return Math.round(currentWeeklyKm * baselineAdvanceFactor(currentWeeklyKm));
  if (adherenceRatio >= 0.4) return currentWeeklyKm;
  return Math.max(15, Math.round(currentWeeklyKm * 0.95));
}

/** Fraction of a block's non-rest sessions the runner actually logged (0-1). */
export function blockAdherenceRatio(plannedNonRest: number, completed: number): number {
  if (plannedNonRest <= 0) return 1;
  return Math.min(1, completed / plannedNonRest);
}
