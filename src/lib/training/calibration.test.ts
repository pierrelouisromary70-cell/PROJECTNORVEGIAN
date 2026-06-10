import { describe, expect, it } from 'vitest';
import {
  applyCalibration,
  calibrationMessage,
  computeCalibration,
  feedbackFromLogs,
  NO_CALIBRATION,
  type QualitySessionFeedback,
} from './calibration';
import { buildPaceZones } from '@/lib/vdot/paces';

function fb(zone: 'lt1' | 'lt2', targetRpe: number, actualRpe: number | null, status: QualitySessionFeedback['status'] = 'done'): QualitySessionFeedback {
  return { zone, targetRpe, actualRpe, status };
}

describe('Virtual lactate calibration', () => {
  it('returns insufficient_data below 3 samples per zone', () => {
    const cal = computeCalibration([fb('lt1', 6, 9), fb('lt1', 6, 9)]);
    expect(cal.lt1Signal).toBe('insufficient_data');
    expect(cal.lt1OffsetSecPerKm).toBe(0);
  });

  it('detects "too fast" when reported RPE consistently exceeds target', () => {
    const cal = computeCalibration([fb('lt1', 6, 8), fb('lt1', 6, 8), fb('lt1', 6, 9)]);
    expect(cal.lt1Signal).toBe('too_fast');
    expect(cal.lt1OffsetSecPerKm).toBeGreaterThan(0);
  });

  it('detects "too slow" when sessions feel consistently easier than prescribed', () => {
    const cal = computeCalibration([fb('lt2', 7, 5), fb('lt2', 7, 5), fb('lt2', 7, 4)]);
    expect(cal.lt2Signal).toBe('too_slow');
    expect(cal.lt2OffsetSecPerKm).toBeLessThan(0);
  });

  it('stays on target inside the ±1 RPE deadband', () => {
    const cal = computeCalibration([fb('lt1', 6, 6), fb('lt1', 6, 7), fb('lt1', 6, 6)]);
    expect(cal.lt1Signal).toBe('on_target');
    expect(cal.lt1OffsetSecPerKm).toBe(0);
  });

  it('caps slowdown at 12 s/km and speedup at 5 s/km (asymmetric by design)', () => {
    const tooHard = computeCalibration([fb('lt1', 6, 10), fb('lt1', 6, 10), fb('lt1', 6, 10), fb('lt1', 6, 10)]);
    expect(tooHard.lt1OffsetSecPerKm).toBe(12);
    const tooEasy = computeCalibration([fb('lt2', 7, 1), fb('lt2', 7, 1), fb('lt2', 7, 1)]);
    expect(tooEasy.lt2OffsetSecPerKm).toBe(-5);
  });

  it('a partial (unfinished) quality session counts as extra drift', () => {
    const finished = computeCalibration([fb('lt2', 7, 8), fb('lt2', 7, 8), fb('lt2', 7, 8)]);
    const unfinished = computeCalibration([
      fb('lt2', 7, 8, 'partial'), fb('lt2', 7, 8, 'partial'), fb('lt2', 7, 8, 'partial'),
    ]);
    expect(unfinished.lt2OffsetSecPerKm).toBeGreaterThan(finished.lt2OffsetSecPerKm);
  });

  it('calibrates each zone independently', () => {
    const cal = computeCalibration([
      fb('lt1', 6, 9), fb('lt1', 6, 9), fb('lt1', 6, 9),
      fb('lt2', 7, 7), fb('lt2', 7, 7), fb('lt2', 7, 7),
    ]);
    expect(cal.lt1Signal).toBe('too_fast');
    expect(cal.lt2Signal).toBe('on_target');
  });

  it('applyCalibration shifts only the LT1/LT2 ranges', () => {
    const zones = buildPaceZones(50);
    const cal = { ...NO_CALIBRATION, lt1OffsetSecPerKm: 8, lt2OffsetSecPerKm: -3 };
    const out = applyCalibration(zones, cal);
    expect(out.lt1.minSecPerKm).toBe(zones.lt1.minSecPerKm + 8);
    expect(out.lt2.maxSecPerKm).toBe(zones.lt2.maxSecPerKm - 3);
    expect(out.easy).toEqual(zones.easy);
    expect(out.interval).toEqual(zones.interval);
  });

  it('applyCalibration is a no-op without offsets', () => {
    const zones = buildPaceZones(50);
    expect(applyCalibration(zones, NO_CALIBRATION)).toBe(zones);
  });

  it('calibrationMessage explains the adjustment in plain language', () => {
    const cal = computeCalibration([fb('lt1', 6, 9), fb('lt1', 6, 9), fb('lt1', 6, 9)]);
    const msg = calibrationMessage(cal);
    expect(msg).toContain('LT1');
    expect(msg).toContain('ralentie');
    expect(calibrationMessage(NO_CALIBRATION)).toBeNull();
  });

  it('feedbackFromLogs maps logs onto planned threshold sessions only', () => {
    const planned = [
      { id: 'a', type: 'lt1_threshold', rpe: 6 },
      { id: 'b', type: 'lt2_threshold', rpe: 7 },
      { id: 'c', type: 'easy', rpe: 3 },
    ];
    const logs = [
      { workout_id: 'a', status: 'done', actual_rpe: 8 },
      { workout_id: 'b', status: 'partial', actual_rpe: 9 },
      { workout_id: 'c', status: 'done', actual_rpe: 3 },
      { workout_id: 'unknown', status: 'done', actual_rpe: 5 },
    ];
    const out = feedbackFromLogs(logs, planned);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ zone: 'lt1', targetRpe: 6, actualRpe: 8, status: 'done' });
    expect(out[1].zone).toBe('lt2');
  });
});
