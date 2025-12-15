import {
  computeSetsForWorkoutIndex,
  computeNextWorkingTarget,
  computeWorkoutDateForStart,
  distributeInteger,
  getWeekStartIsoDateMonday,
  getLocalIsoDate,
} from './workouts.utils';
import { Weekday } from '../users/types/weekday';

describe('workouts.utils', () => {
  describe('computeSetsForWorkoutIndex', () => {
    it('distributes remainder to early workouts', () => {
      // 12 sets/week across 5 workouts => 3,3,2,2,2
      expect(computeSetsForWorkoutIndex(12, 5, 0)).toBe(3);
      expect(computeSetsForWorkoutIndex(12, 5, 1)).toBe(3);
      expect(computeSetsForWorkoutIndex(12, 5, 2)).toBe(2);
      expect(computeSetsForWorkoutIndex(12, 5, 3)).toBe(2);
      expect(computeSetsForWorkoutIndex(12, 5, 4)).toBe(2);
    });
  });

  describe('getWeekStartIsoDateMonday', () => {
    it('returns Monday of current week', () => {
      const d = new Date('2025-12-14T10:00:00.000Z'); // Sunday
      expect(getWeekStartIsoDateMonday(d)).toBe('2025-12-08');
    });
  });

  describe('distributeInteger', () => {
    it('distributes remainder to early buckets', () => {
      expect(distributeInteger(12, 5)).toEqual([3, 3, 2, 2, 2]);
      expect(distributeInteger(4, 3)).toEqual([2, 1, 1]);
      expect(distributeInteger(0, 3)).toEqual([0, 0, 0]);
    });
  });

  describe('computeNextWorkingTarget', () => {
    it('keeps target if best reps is below target', () => {
      expect(
        computeNextWorkingTarget({
          repRangeMin: 8,
          repRangeMax: 12,
          currentTargetReps: 8,
          bestRepsDone: 7,
          currentWorkingWeightKg: 60,
          weightStepKg: 2.5,
        }),
      ).toEqual({
        nextWorkingWeightKg: 60,
        nextTargetReps: 8,
        didIncreaseWeight: false,
      });
    });

    it('increments target to best reps + 1 when within range', () => {
      expect(
        computeNextWorkingTarget({
          repRangeMin: 8,
          repRangeMax: 12,
          currentTargetReps: 8,
          bestRepsDone: 10,
          currentWorkingWeightKg: 60,
          weightStepKg: 2.5,
        }),
      ).toEqual({
        nextWorkingWeightKg: 60,
        nextTargetReps: 11,
        didIncreaseWeight: false,
      });
    });

    it('increases weight and resets target to min when exceeding max', () => {
      expect(
        computeNextWorkingTarget({
          repRangeMin: 8,
          repRangeMax: 12,
          currentTargetReps: 12,
          bestRepsDone: 12,
          currentWorkingWeightKg: 60,
          weightStepKg: 2.5,
        }),
      ).toEqual({
        nextWorkingWeightKg: 62.5,
        nextTargetReps: 8,
        didIncreaseWeight: true,
      });
    });
  });

  describe('computeWorkoutDateForStart', () => {
    it('returns today when today is a training day', () => {
      const now = new Date('2025-12-15T12:00:00.000Z'); // Monday
      const result = computeWorkoutDateForStart(now, [Weekday.Mon]);
      expect(result).toBeDefined();
      expect(getLocalIsoDate(result!)).toBe(getLocalIsoDate(new Date(now)));
    });
  });
});
