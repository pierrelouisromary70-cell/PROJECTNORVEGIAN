// "Virtual lactate" calibration — the differentiator of Nordic Run.
//
// The Norwegian method is built on lactate control: Ingebrigtsen-style
// double-threshold only works if LT1/LT2 intensities are truly respected.
// Pros prick their ear; amateurs can't. This module replaces the lactate
// meter with the data we already collect: post-session RPE and completion
// status of every quality workout.
//
// Principle: every LT1/LT2 session carries a prescribed RPE. If the runner
// consistently reports HIGHER effort than prescribed (or fails to finish),
// their threshold paces are mis-calibrated → slow the zones down. If they
// consistently report LOWER effort, the VDOT underestimates them → speed
// the zones up slightly. Asymmetric on purpose: in sub-threshold training,
// running too fast is the cardinal sin, running too slow is cheap.

import type { PaceZones } from '@/lib/vdot/paces';

export type CalibrationZone = 'lt1' | 'lt2';
export type CalibrationSignal = 'too_fast' | 'too_slow' | 'on_target' | 'insufficient_data';

export interface QualitySessionFeedback {
  zone: CalibrationZone;
  /** RPE the plan prescribed for the session (workout.rpe). */
  targetRpe: number;
  /** RPE the runner reported after the session (workout_logs.actual_rpe). */
  actualRpe: number | null;
  status: 'done' | 'skipped' | 'partial' | 'replaced';
}

export interface ZoneCalibration {
  /** Seconds per km to ADD to the LT1 pace range (positive = slow down). */
  lt1OffsetSecPerKm: number;
  /** Seconds per km to ADD to the LT2 pace range (positive = slow down). */
  lt2OffsetSecPerKm: number;
  lt1Signal: CalibrationSignal;
  lt2Signal: CalibrationSignal;
  /** Number of usable feedback samples per zone. */
  lt1Samples: number;
  lt2Samples: number;
}

export const NO_CALIBRATION: ZoneCalibration = {
  lt1OffsetSecPerKm: 0,
  lt2OffsetSecPerKm: 0,
  lt1Signal: 'insufficient_data',
  lt2Signal: 'insufficient_data',
  lt1Samples: 0,
  lt2Samples: 0,
};

/** Minimum feedback samples in a zone before we trust the drift. */
const MIN_SAMPLES = 3;
/** Mean RPE drift below which we consider the zone on target. */
const DRIFT_DEADBAND = 1.0;
/** Seconds/km of correction per point of mean RPE drift. */
const SEC_PER_DRIFT_POINT = 4;
/** A quality session the runner could not finish counts as this much extra drift. */
const PARTIAL_PENALTY = 1.5;
/** Never slow a zone by more than this. */
const MAX_SLOWDOWN = 12;
/** Never speed a zone up by more than this — VDOT updates (new race perf) are the right lever for big jumps. */
const MAX_SPEEDUP = 5;

function calibrateZone(samples: QualitySessionFeedback[]): { offset: number; signal: CalibrationSignal; count: number } {
  const usable = samples.filter(
    (s) => (s.status === 'done' || s.status === 'partial') && s.actualRpe !== null,
  );
  if (usable.length < MIN_SAMPLES) {
    return { offset: 0, signal: 'insufficient_data', count: usable.length };
  }
  const drifts = usable.map((s) => {
    const base = (s.actualRpe as number) - s.targetRpe;
    return s.status === 'partial' ? base + PARTIAL_PENALTY : base;
  });
  const mean = drifts.reduce((a, b) => a + b, 0) / drifts.length;
  if (Math.abs(mean) < DRIFT_DEADBAND) {
    return { offset: 0, signal: 'on_target', count: usable.length };
  }
  const raw = Math.round(mean * SEC_PER_DRIFT_POINT);
  const offset = Math.max(-MAX_SPEEDUP, Math.min(MAX_SLOWDOWN, raw));
  return { offset, signal: mean > 0 ? 'too_fast' : 'too_slow', count: usable.length };
}

/**
 * Compute the zone calibration from recent quality-session feedback
 * (most recent ~6 weeks; the caller decides the window).
 */
export function computeCalibration(feedback: QualitySessionFeedback[]): ZoneCalibration {
  const lt1 = calibrateZone(feedback.filter((f) => f.zone === 'lt1'));
  const lt2 = calibrateZone(feedback.filter((f) => f.zone === 'lt2'));
  return {
    lt1OffsetSecPerKm: lt1.offset,
    lt2OffsetSecPerKm: lt2.offset,
    lt1Signal: lt1.signal,
    lt2Signal: lt2.signal,
    lt1Samples: lt1.count,
    lt2Samples: lt2.count,
  };
}

/** Apply the calibration offsets to the VDOT-derived pace zones. */
export function applyCalibration(zones: PaceZones, cal: ZoneCalibration): PaceZones {
  if (cal.lt1OffsetSecPerKm === 0 && cal.lt2OffsetSecPerKm === 0) return zones;
  return {
    ...zones,
    lt1: {
      minSecPerKm: zones.lt1.minSecPerKm + cal.lt1OffsetSecPerKm,
      maxSecPerKm: zones.lt1.maxSecPerKm + cal.lt1OffsetSecPerKm,
    },
    lt2: {
      minSecPerKm: zones.lt2.minSecPerKm + cal.lt2OffsetSecPerKm,
      maxSecPerKm: zones.lt2.maxSecPerKm + cal.lt2OffsetSecPerKm,
    },
  };
}

/**
 * Human-readable summary (FR) for the dashboard — tells the runner WHY their
 * paces moved, which is what builds trust in the system.
 */
export function calibrationMessage(cal: ZoneCalibration): string | null {
  const parts: string[] = [];
  if (cal.lt1Signal === 'too_fast') {
    parts.push(`Vos retours sur les séances sous-seuil (LT1) indiquent un effort trop élevé : allure LT1 ralentie de ${cal.lt1OffsetSecPerKm} s/km.`);
  } else if (cal.lt1Signal === 'too_slow') {
    parts.push(`Vos séances sous-seuil (LT1) semblent trop faciles : allure LT1 accélérée de ${-cal.lt1OffsetSecPerKm} s/km.`);
  }
  if (cal.lt2Signal === 'too_fast') {
    parts.push(`Vos séances seuil (LT2) sortent trop dures : allure LT2 ralentie de ${cal.lt2OffsetSecPerKm} s/km.`);
  } else if (cal.lt2Signal === 'too_slow') {
    parts.push(`Vos séances seuil (LT2) semblent sous-dosées : allure LT2 accélérée de ${-cal.lt2OffsetSecPerKm} s/km.`);
  }
  if (parts.length === 0) return null;
  return parts.join(' ');
}

// ---------------------------------------------------------------------
// Adapter: build feedback samples from stored workout logs + the block.
// ---------------------------------------------------------------------

export interface WorkoutLogRow {
  workout_id: string;
  status: string;
  actual_rpe: number | null;
}

export interface PlannedQualityWorkout {
  id: string;
  type: string; // WorkoutType
  rpe: number;
}

/** Map raw workout logs onto the planned sessions to produce calibration feedback. */
export function feedbackFromLogs(
  logs: WorkoutLogRow[],
  planned: PlannedQualityWorkout[],
): QualitySessionFeedback[] {
  const byId = new Map(planned.map((w) => [w.id, w]));
  const out: QualitySessionFeedback[] = [];
  for (const log of logs) {
    const w = byId.get(log.workout_id);
    if (!w) continue;
    let zone: CalibrationZone | null = null;
    if (w.type === 'lt1_threshold') zone = 'lt1';
    else if (w.type === 'lt2_threshold') zone = 'lt2';
    if (!zone) continue;
    if (!['done', 'skipped', 'partial', 'replaced'].includes(log.status)) continue;
    out.push({
      zone,
      targetRpe: w.rpe,
      actualRpe: log.actual_rpe,
      status: log.status as QualitySessionFeedback['status'],
    });
  }
  return out;
}
