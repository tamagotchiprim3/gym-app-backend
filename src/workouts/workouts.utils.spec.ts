import {
  computeSetsForWorkoutIndex,
  distributeInteger,
  getWeekStartIsoDateMonday,
} from './workouts.utils';

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
});
