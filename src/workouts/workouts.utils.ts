import { Weekday } from '../users/types/weekday';

const weekdayToJsDayIndex: Record<Weekday, number> = {
  [Weekday.Mon]: 1,
  [Weekday.Tue]: 2,
  [Weekday.Wed]: 3,
  [Weekday.Thu]: 4,
  [Weekday.Fri]: 5,
  [Weekday.Sat]: 6,
  [Weekday.Sun]: 0,
};

export function computeSetsForWorkoutIndex(
  setsPerWeek: number,
  trainingDaysPerWeek: number,
  workoutIndex: number,
) {
  const days = trainingDaysPerWeek;
  const base = Math.floor(setsPerWeek / days);
  const remainder = setsPerWeek % days;
  return base + (workoutIndex < remainder ? 1 : 0);
}

export function distributeInteger(total: number, buckets: number) {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error('Invalid total');
  }
  if (!Number.isInteger(buckets) || buckets <= 0) {
    throw new Error('Invalid buckets');
  }
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function getWeekStartIsoDateMonday(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay(); // 0..6 (Sun..Sat)
  const diffToMonday = (jsDay + 6) % 7; // Mon => 0, Tue => 1, ... Sun => 6
  d.setDate(d.getDate() - diffToMonday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function computeNextWorkoutAt(now: Date, trainingDays: Weekday[]) {
  if (!Array.isArray(trainingDays) || trainingDays.length === 0) return undefined;

  const dayIndexes = Array.from(
    new Set(trainingDays.map((d) => weekdayToJsDayIndex[d])),
  ).sort((a, b) => a - b);

  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(0);
  start.setDate(start.getDate() + 1); // exclude today

  for (let offset = 0; offset < 14; offset++) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (dayIndexes.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return undefined;
}
