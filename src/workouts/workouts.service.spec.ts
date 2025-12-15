import { WorkoutsService } from './workouts.service';
import { WorkoutKind } from './types/workout-kind';
import { WorkoutStatus } from './types/workout-status';

describe('WorkoutsService', () => {
  const sessionsRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const setsRepository = { count: jest.fn(), find: jest.fn() };
  const workingWeightsRepository = { find: jest.fn(), save: jest.fn() };
  const scheduleRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const usersService = { findById: jest.fn() };

  let service: WorkoutsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WorkoutsService(
      sessionsRepository as any,
      setsRepository as any,
      workingWeightsRepository as any,
      scheduleRepository as any,
      usersService as any,
    );
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-12-15T10:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('rejects finishing regular workout when incomplete and not forced', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      trainingDays: ['mon'],
      repRangeMin: 8,
      repRangeMax: 12,
      exercisesPerGroupPerWorkout: 1,
      exercises: [],
    });
    sessionsRepository.findOne.mockResolvedValue({
      id: 10,
      kind: WorkoutKind.Regular,
      status: WorkoutStatus.InProgress,
      plannedWorkingSetsTotal: 4,
      user: { id: 1 },
      plannedExerciseIds: [],
      plannedMuscleGroups: [],
    });
    setsRepository.count.mockResolvedValue(2);
    setsRepository.find.mockResolvedValue([]);
    scheduleRepository.findOne.mockResolvedValue(null);
    scheduleRepository.create.mockImplementation((x: any) => x);
    scheduleRepository.save.mockImplementation(async (x: any) => x);
    sessionsRepository.save.mockImplementation(async (x: any) => x);
    workingWeightsRepository.find.mockResolvedValue([]);

    const res = await service.finish({ id: 1 } as any, 10);
    expect(res.isComplete).toBe(false);
    const savedSchedule = scheduleRepository.save.mock.calls.at(-1)?.[0];
    expect(savedSchedule.workoutsCompletedThisWeek).toBe(1);
    expect(savedSchedule.nextWorkoutAt).toBeDefined();
  });

  it('allows finishing regular workout when forced', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      trainingDays: ['mon'],
      repRangeMin: 8,
      repRangeMax: 12,
      exercisesPerGroupPerWorkout: 1,
      exercises: [],
    });
    sessionsRepository.findOne.mockResolvedValue({
      id: 10,
      kind: WorkoutKind.Regular,
      status: WorkoutStatus.InProgress,
      plannedWorkingSetsTotal: 4,
      user: { id: 1 },
      plannedExerciseIds: [],
      plannedMuscleGroups: [],
    });
    scheduleRepository.findOne.mockResolvedValue(null);
    scheduleRepository.create.mockImplementation((x: any) => x);
    scheduleRepository.save.mockImplementation(async (x: any) => x);
    sessionsRepository.save.mockImplementation(async (x: any) => x);
    workingWeightsRepository.find.mockResolvedValue([]);
    setsRepository.find.mockResolvedValue([]);

    const res = await service.finish({ id: 1 } as any, 10, { force: true });
    expect(res.status).toBe(WorkoutStatus.Finished);
    const savedSchedule = scheduleRepository.save.mock.calls.at(-1)?.[0];
    expect(savedSchedule.workoutsCompletedThisWeek).toBe(1);
  });
});
