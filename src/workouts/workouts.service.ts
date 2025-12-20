import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { UserWorkingWeight } from './entities/user-working-weight.entity';
import { UserScheduleState } from './entities/user-schedule-state.entity';
import {
  computeNextWorkoutAt,
  computeNextWorkingTarget,
  computeSetsForWorkoutIndex,
  computeWorkoutDateForStart,
  distributeInteger,
  getLocalIsoDate,
  getWeekStartIsoDateMonday,
} from './workouts.utils';
import { WorkoutKind } from './types/workout-kind';
import { WorkoutStatus } from './types/workout-status';
import { WorkoutSetType } from './types/workout-set-type';
import { MuscleGroup } from '../exercises/interfaces/muscle-group';
import { TrainingMode } from '../users/types/training-mode';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(WorkoutSession)
    private readonly sessionsRepository: Repository<WorkoutSession>,
    @InjectRepository(WorkoutSet)
    private readonly setsRepository: Repository<WorkoutSet>,
    @InjectRepository(UserWorkingWeight)
    private readonly workingWeightsRepository: Repository<UserWorkingWeight>,
    @InjectRepository(UserScheduleState)
    private readonly scheduleRepository: Repository<UserScheduleState>,
    private readonly usersService: UsersService,
  ) {}

  async startInit(currentUser: User, options?: { force?: boolean }) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) throw new NotFoundException('User not found');
    if (!user.exercises?.length) {
      throw new BadRequestException('User has no exercises');
    }
    if (!user.trainingDays?.length) {
      throw new BadRequestException('User has no trainingDays');
    }

    const weights = await this.workingWeightsRepository.find({
      where: { user: { id: user.id } },
      relations: { exercise: true },
    });
    const weightByExerciseId = new Map(weights.map((w) => [w.exercise.id, w]));

    const missing = user.exercises.filter((e) => !weightByExerciseId.has(e.id));
    if (!missing.length) {
      throw new BadRequestException('Working weights already initialized');
    }

    const now = new Date();
    const weekStartDate = getWeekStartIsoDateMonday(now);
    let schedule = await this.scheduleRepository.findOne({
      where: { user: { id: user.id } },
      relations: { user: true },
    });

    if (!schedule) {
      schedule = this.scheduleRepository.create({
        user: { id: user.id } as User,
        weekStartDate,
        workoutsCompletedThisWeek: 0,
      });
    } else if (schedule.weekStartDate !== weekStartDate) {
      schedule.weekStartDate = weekStartDate;
      schedule.workoutsCompletedThisWeek = 0;
    }
    if (!schedule.nextWorkoutAt) {
      schedule.nextWorkoutAt = computeWorkoutDateForStart(now, user.trainingDays);
    }
    if (schedule.nextWorkoutAt && !options?.force) {
      const today = getLocalIsoDate(now);
      const scheduled = getLocalIsoDate(new Date(schedule.nextWorkoutAt));
      if (today !== scheduled) {
        throw new BadRequestException(`Next workout is scheduled for ${scheduled}`);
      }
    }

    const workoutIndex =
      schedule.workoutsCompletedThisWeek % user.trainingDays.length;
    const plannedTrainingDay = user.trainingDays[workoutIndex];
    const plannedWorkingSetsPerGroup = computeSetsForWorkoutIndex(
      user.setsPerGroupPerWeek,
      user.trainingDays.length,
      workoutIndex,
    );

    const exercisesByGroup = new Map<MuscleGroup, typeof user.exercises>();
    for (const ex of user.exercises) {
      const group = ex.muscleGroup ?? MuscleGroup.Other;
      const arr = exercisesByGroup.get(group) ?? [];
      arr.push(ex);
      exercisesByGroup.set(group, arr);
    }

    let muscleGroupsForWorkout: MuscleGroup[];
    if (user.trainingMode === TrainingMode.FullBody) {
      muscleGroupsForWorkout = Array.from(exercisesByGroup.keys());
    } else if (user.trainingMode === TrainingMode.Split) {
      const groups = (user.splitDays as any)?.[plannedTrainingDay];
      if (!Array.isArray(groups) || groups.length === 0) {
        throw new BadRequestException(`splitDays.${plannedTrainingDay} is required`);
      }
      muscleGroupsForWorkout = groups;
    } else {
      throw new BadRequestException('Invalid trainingMode');
    }

    const groupRotation = schedule.groupRotation ?? {};
    const perGroup = user.exercisesPerGroupPerWorkout ?? 1;

    const plannedExerciseIds: number[] = [];
    const plannedMuscleGroups: MuscleGroup[] = [];
    const plannedWorkingSetsByExerciseId = new Map<number, number>();

    for (const group of muscleGroupsForWorkout) {
      const groupExercises = (exercisesByGroup.get(group) ?? []).slice();
      if (!groupExercises.length) continue;

      plannedMuscleGroups.push(group);
      groupExercises.sort((a, b) => a.id - b.id);
      const rotationIndex = Number((groupRotation as any)[group] ?? 0);

      const missingInGroup = new Set(
        groupExercises.filter((e) => !weightByExerciseId.has(e.id)).map((e) => e.id),
      );

      const selected: typeof groupExercises = [];
      for (let i = 0; i < groupExercises.length && selected.length < perGroup; i++) {
        const idx = (rotationIndex + i) % groupExercises.length;
        const candidate = groupExercises[idx];
        if (missingInGroup.has(candidate.id)) selected.push(candidate);
      }
      for (let i = 0; i < groupExercises.length && selected.length < perGroup; i++) {
        const idx = (rotationIndex + i) % groupExercises.length;
        const candidate = groupExercises[idx];
        if (selected.some((s) => s.id === candidate.id)) continue;
        selected.push(candidate);
      }

      const takeCount = selected.length;
      const perExerciseSets = distributeInteger(plannedWorkingSetsPerGroup, takeCount);
      selected.forEach((e, i) => {
        plannedExerciseIds.push(e.id);
        plannedWorkingSetsByExerciseId.set(e.id, perExerciseSets[i] ?? 0);
      });
    }

    if (!plannedExerciseIds.length) {
      throw new BadRequestException('No exercises selected for init workout');
    }

    const plannedWorkingSetsTotal = plannedExerciseIds.reduce(
      (sum, id) => sum + (plannedWorkingSetsByExerciseId.get(id) ?? 0),
      0,
    );

    schedule = await this.scheduleRepository.save(schedule);

    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        user: { id: user.id } as User,
        kind: WorkoutKind.Init,
        status: WorkoutStatus.InProgress,
        plannedExerciseIds,
        plannedMuscleGroups,
        plannedTrainingDay,
        plannedWorkingSetsPerGroup,
        plannedWorkingSetsTotal,
        plannedWorkingSetsByExerciseId: Object.fromEntries(
          plannedWorkingSetsByExerciseId.entries(),
        ),
      }),
    );

    const selectedExercises = user.exercises.filter((e) =>
      plannedExerciseIds.includes(e.id),
    );

    return {
      sessionId: session.id,
      kind: session.kind,
      plannedTrainingDay,
      repRangeMin: user.repRangeMin,
      repRangeMax: user.repRangeMax,
      plannedWorkingSetsPerGroup,
      plannedWorkingSetsTotal,
      exercises: selectedExercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup ?? MuscleGroup.Other,
        hasWorkingWeight: weightByExerciseId.has(e.id),
        workingWeightKg: weightByExerciseId.get(e.id)?.workingWeightKg ?? null,
        targetReps: weightByExerciseId.get(e.id)?.targetReps ?? null,
        plannedWorkingSets: plannedWorkingSetsByExerciseId.get(e.id) ?? 0,
      })),
      totalExercises: plannedExerciseIds.length,
      remainingExercisesToInit: missing.length,
      schedule: {
        weekStartDate: schedule.weekStartDate,
        workoutsCompletedThisWeek: schedule.workoutsCompletedThisWeek,
        nextWorkoutAt: schedule.nextWorkoutAt ?? null,
      },
    };
  }

  async startRegular(currentUser: User, options?: { force?: boolean }) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) throw new NotFoundException('User not found');
    if (!user.exercises?.length) {
      throw new BadRequestException('User has no exercises');
    }
    if (!user.trainingDays?.length) {
      throw new BadRequestException('User has no trainingDays');
    }

    const now = new Date();
    const weekStartDate = getWeekStartIsoDateMonday(now);
    let schedule = await this.scheduleRepository.findOne({
      where: { user: { id: user.id } },
      relations: { user: true },
    });

    if (!schedule) {
      schedule = this.scheduleRepository.create({
        user: { id: user.id } as User,
        weekStartDate,
        workoutsCompletedThisWeek: 0,
      });
    } else if (schedule.weekStartDate !== weekStartDate) {
      schedule.weekStartDate = weekStartDate;
      schedule.workoutsCompletedThisWeek = 0;
    }

    if (!schedule.nextWorkoutAt) {
      schedule.nextWorkoutAt = computeWorkoutDateForStart(now, user.trainingDays);
    }
    if (schedule.nextWorkoutAt && !options?.force) {
      const today = getLocalIsoDate(now);
      const scheduled = getLocalIsoDate(new Date(schedule.nextWorkoutAt));
      if (today !== scheduled) {
        throw new BadRequestException(`Next workout is scheduled for ${scheduled}`);
      }
    }

    const workoutIndex =
      schedule.workoutsCompletedThisWeek % user.trainingDays.length;
    const plannedTrainingDay = user.trainingDays[workoutIndex];
    const plannedWorkingSetsPerGroup = computeSetsForWorkoutIndex(
      user.setsPerGroupPerWeek,
      user.trainingDays.length,
      workoutIndex,
    );

    const exercisesByGroup = new Map<MuscleGroup, typeof user.exercises>();
    for (const ex of user.exercises) {
      const group = ex.muscleGroup ?? MuscleGroup.Other;
      const arr = exercisesByGroup.get(group) ?? [];
      arr.push(ex);
      exercisesByGroup.set(group, arr);
    }

    let muscleGroupsForWorkout: MuscleGroup[];
    if (user.trainingMode === TrainingMode.FullBody) {
      muscleGroupsForWorkout = Array.from(exercisesByGroup.keys());
    } else if (user.trainingMode === TrainingMode.Split) {
      const groups = (user.splitDays as any)?.[plannedTrainingDay];
      if (!Array.isArray(groups) || groups.length === 0) {
        throw new BadRequestException(`splitDays.${plannedTrainingDay} is required`);
      }
      muscleGroupsForWorkout = groups;
    } else {
      throw new BadRequestException('Invalid trainingMode');
    }

    const groupRotation = schedule.groupRotation ?? {};
    const exercisesPerGroupPerWorkout = user.exercisesPerGroupPerWorkout ?? 1;

    const plannedExercises: Array<{
      id: number;
      name: string;
      muscleGroup: MuscleGroup;
      plannedWorkingSets: number;
    }> = [];
    const plannedExerciseIds: number[] = [];

    for (const muscleGroup of muscleGroupsForWorkout) {
      const groupExercises = (exercisesByGroup.get(muscleGroup) ?? []).slice();
      if (!groupExercises.length) continue;

      groupExercises.sort((a, b) => a.id - b.id);
      const rotationIndex = Number((groupRotation as any)[muscleGroup] ?? 0);
      const takeCount = Math.min(exercisesPerGroupPerWorkout, groupExercises.length);

      const selected = Array.from({ length: takeCount }, (_, i) => {
        const idx = (rotationIndex + i) % groupExercises.length;
        return groupExercises[idx];
      });

      const perExerciseSets = distributeInteger(plannedWorkingSetsPerGroup, takeCount);
      selected.forEach((ex, i) => {
        plannedExercises.push({
          id: ex.id,
          name: ex.name,
          muscleGroup,
          plannedWorkingSets: perExerciseSets[i],
        });
        plannedExerciseIds.push(ex.id);
      });
    }

    if (!plannedExercises.length) {
      throw new BadRequestException('No exercises selected for workout');
    }

    const plannedWorkingSetsTotal = plannedExercises.reduce(
      (sum, e) => sum + e.plannedWorkingSets,
      0,
    );

    schedule = await this.scheduleRepository.save(schedule);

    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        user: { id: user.id } as User,
        kind: WorkoutKind.Regular,
        status: WorkoutStatus.InProgress,
        plannedTrainingDay,
        plannedWorkingSetsPerGroup,
        plannedWorkingSetsTotal,
        plannedExerciseIds,
        plannedMuscleGroups: muscleGroupsForWorkout,
      }),
    );

    const weights = await this.workingWeightsRepository.find({
      where: { user: { id: user.id } },
      relations: { exercise: true },
    });
    const weightByExerciseId = new Map(weights.map((w) => [w.exercise.id, w]));

    return {
      sessionId: session.id,
      kind: session.kind,
      plannedTrainingDay,
      plannedWorkingSetsPerGroup,
      plannedWorkingSetsTotal,
      repRangeMin: user.repRangeMin,
      repRangeMax: user.repRangeMax,
      exercises: plannedExercises.map((e) => ({
        ...e,
        workingWeightKg: weightByExerciseId.get(e.id)?.workingWeightKg ?? null,
        targetReps:
          weightByExerciseId.get(e.id)?.targetReps ?? user.repRangeMin,
      })),
      schedule: {
        weekStartDate: schedule.weekStartDate,
        workoutsCompletedThisWeek: schedule.workoutsCompletedThisWeek,
        nextWorkoutAt: schedule.nextWorkoutAt ?? null,
      },
    };
  }

  async addSet(
    currentUser: User,
    sessionId: number,
    params: {
      exerciseId: number;
      setType: WorkoutSetType;
      repsDone: number;
      weightKg?: number;
    },
  ) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) throw new NotFoundException('User not found');

    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: { user: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.user.id !== user.id) throw new ForbiddenException();
    if (session.status !== WorkoutStatus.InProgress) {
      throw new BadRequestException('Session is not in progress');
    }

    const exerciseId = Number(params.exerciseId);
    if (!Number.isInteger(exerciseId)) {
      throw new BadRequestException('Invalid exerciseId');
    }
    const userExerciseIds = new Set((user.exercises ?? []).map((e) => e.id));
    if (!userExerciseIds.has(exerciseId)) {
      throw new ForbiddenException('Exercise does not belong to user');
    }

    const repsDone = Number(params.repsDone);
    if (!Number.isInteger(repsDone) || repsDone < 1 || repsDone > 500) {
      throw new BadRequestException('Invalid repsDone');
    }

    if (session.kind === WorkoutKind.Init) {
      const plannedMap = session.plannedWorkingSetsByExerciseId ?? {};
      const plannedLimit = Number((plannedMap as any)[exerciseId] ?? 0);
      if (Number.isInteger(plannedLimit) && plannedLimit > 0) {
        const usedSlots = await this.setsRepository.count({
          where: {
            session: { id: session.id },
            user: { id: user.id },
            exercise: { id: exerciseId },
            setType: In([WorkoutSetType.InitAttempt, WorkoutSetType.Working]),
          } as any,
        });
        if (usedSlots >= plannedLimit) {
          throw new BadRequestException(
            'Planned sets limit reached for this exercise',
          );
        }
      }
    }

    let weightKg: number;
    if (params.setType === WorkoutSetType.Working) {
      const workingWeight = await this.workingWeightsRepository.findOne({
        where: {
          user: { id: user.id },
          exercise: { id: exerciseId },
        },
        relations: { exercise: true },
      });
      if (!workingWeight) {
        throw new BadRequestException('Working weight is not initialized');
      }
      weightKg = workingWeight.workingWeightKg;
    } else {
      const parsed = Number(params.weightKg);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 2000) {
        throw new BadRequestException('Invalid weightKg');
      }
      weightKg = parsed;
    }

    const set = await this.setsRepository.save(
      this.setsRepository.create({
        session: { id: session.id } as WorkoutSession,
        user: { id: user.id } as User,
        exercise: { id: exerciseId } as any,
        setType: params.setType,
        weightKg,
        repsDone,
      }),
    );

    let status: 'saved' | 'in_range' | 'too_light' | 'too_heavy' = 'saved';
    if (params.setType === WorkoutSetType.InitAttempt) {
      if (repsDone < user.repRangeMin) status = 'too_heavy';
      else if (repsDone > user.repRangeMax) status = 'too_light';
      else status = 'in_range';

      if (status === 'in_range') {
        const existing = await this.workingWeightsRepository.findOne({
          where: {
            user: { id: user.id },
            exercise: { id: exerciseId },
          },
        });
        await this.workingWeightsRepository.save(
          this.workingWeightsRepository.create({
            ...(existing ? { id: existing.id } : null),
            user: { id: user.id } as User,
            exercise: { id: exerciseId } as any,
            workingWeightKg: weightKg,
            repsDone,
            targetReps: repsDone,
          }),
        );
      }
    }

    return {
      setId: set.id,
      sessionId: session.id,
      exerciseId,
      setType: set.setType,
      weightKg: set.weightKg,
      repsDone: set.repsDone,
      status,
    };
  }

  async finish(
    currentUser: User,
    sessionId: number,
    options?: { force?: boolean },
  ) {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) throw new NotFoundException('User not found');

    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: { user: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.user.id !== user.id) throw new ForbiddenException();
    if (session.status !== WorkoutStatus.InProgress) {
      throw new BadRequestException('Session is not in progress');
    }

    const now = new Date();

    if (session.kind === WorkoutKind.Regular) {
      const workingSetsCount = await this.setsRepository.count({
        where: {
          session: { id: session.id },
          user: { id: user.id },
          setType: WorkoutSetType.Working,
        } as any,
      });

      const plannedTotal = session.plannedWorkingSetsTotal ?? 0;
      const isComplete =
        plannedTotal > 0 ? workingSetsCount >= plannedTotal : workingSetsCount > 0;

      session.completedWorkingSets = workingSetsCount;
      session.isComplete = isComplete;
      session.isForceFinished = Boolean(options?.force);

      const now = new Date();
      const weekStartDate = getWeekStartIsoDateMonday(now);
      let schedule = await this.scheduleRepository.findOne({
        where: { user: { id: user.id } },
        relations: { user: true },
      });
      if (!schedule) {
        schedule = this.scheduleRepository.create({
          user: { id: user.id } as User,
          weekStartDate,
          workoutsCompletedThisWeek: 0,
        });
      } else if (schedule.weekStartDate !== weekStartDate) {
        schedule.weekStartDate = weekStartDate;
        schedule.workoutsCompletedThisWeek = 0;
      }
      const sessionSets = await this.setsRepository.find({
        where: {
          session: { id: session.id },
          user: { id: user.id },
          setType: WorkoutSetType.Working,
        } as any,
        relations: { exercise: true },
      });
      const bestRepsByExerciseId = new Map<number, number>();
      for (const s of sessionSets) {
        const id = s.exercise.id;
        const best = bestRepsByExerciseId.get(id);
        if (best === undefined || s.repsDone > best) {
          bestRepsByExerciseId.set(id, s.repsDone);
        }
      }

      const plannedExerciseIds = session.plannedExerciseIds ?? [];
      if (plannedExerciseIds.length) {
        const weights = await this.workingWeightsRepository.find({
          where: {
            user: { id: user.id },
          },
          relations: { exercise: true },
        });
        const byExerciseId = new Map(weights.map((w) => [w.exercise.id, w]));

        for (const exerciseId of plannedExerciseIds) {
          const bestRepsDone = bestRepsByExerciseId.get(exerciseId);
          if (bestRepsDone === undefined) continue;

          const ww = byExerciseId.get(exerciseId);
          if (!ww) continue;

          const currentTargetReps = Number.isInteger(ww.targetReps)
            ? ww.targetReps
            : user.repRangeMin;

          const { nextTargetReps, nextWorkingWeightKg } = computeNextWorkingTarget(
            {
              repRangeMin: user.repRangeMin,
              repRangeMax: user.repRangeMax,
              currentTargetReps,
              bestRepsDone,
              currentWorkingWeightKg: ww.workingWeightKg,
              weightStepKg: ww.exercise.weightStepKg ?? 2.5,
            },
          );

          ww.targetReps = nextTargetReps;
          ww.workingWeightKg = nextWorkingWeightKg;
          ww.repsDone = bestRepsDone;
          await this.workingWeightsRepository.save(ww);
        }
      }

      schedule.workoutsCompletedThisWeek += 1;
      schedule.nextWorkoutAt = computeNextWorkoutAt(now, user.trainingDays);

      const rotation = schedule.groupRotation ?? {};
      const plannedGroups = session.plannedMuscleGroups ?? [];
      const exercisesPerGroupPerWorkout = user.exercisesPerGroupPerWorkout ?? 1;

      const exercisesByGroup = new Map<MuscleGroup, typeof user.exercises>();
      for (const ex of user.exercises ?? []) {
        const group = ex.muscleGroup ?? MuscleGroup.Other;
        const arr = exercisesByGroup.get(group) ?? [];
        arr.push(ex);
        exercisesByGroup.set(group, arr);
      }

      for (const group of plannedGroups) {
        const total = exercisesByGroup.get(group)?.length ?? 0;
        if (total <= 1) continue;
        const current = Number((rotation as any)[group] ?? 0);
        const advance = Math.min(exercisesPerGroupPerWorkout, total);
        (rotation as any)[group] = (current + advance) % total;
      }
      schedule.groupRotation = rotation;
      await this.scheduleRepository.save(schedule);
    }

    if (session.kind === WorkoutKind.Init) {
      const plannedExerciseIds = session.plannedExerciseIds ?? [];
      const plannedTotal = session.plannedWorkingSetsTotal ?? 0;

      const workingSets = await this.setsRepository.find({
        where: {
          session: { id: session.id },
          user: { id: user.id },
          setType: WorkoutSetType.Working,
        } as any,
        relations: { exercise: true },
      });

      const bestRepsByExerciseId = new Map<number, number>();
      for (const s of workingSets) {
        const exId = (s.exercise as any).id as number;
        const prev = bestRepsByExerciseId.get(exId);
        if (prev === undefined || s.repsDone > prev) bestRepsByExerciseId.set(exId, s.repsDone);
      }

      if (plannedExerciseIds.length) {
        const weights = await this.workingWeightsRepository.find({
          where: { user: { id: user.id } },
          relations: { exercise: true },
        });
        const byExerciseId = new Map(weights.map((w) => [w.exercise.id, w]));

        for (const exerciseId of plannedExerciseIds) {
          const bestRepsDone = bestRepsByExerciseId.get(exerciseId);
          if (bestRepsDone === undefined) continue;

          const ww = byExerciseId.get(exerciseId);
          if (!ww) continue;

          const currentTargetReps = Number.isInteger(ww.targetReps)
            ? ww.targetReps
            : user.repRangeMin;

          const { nextTargetReps, nextWorkingWeightKg } = computeNextWorkingTarget(
            {
              repRangeMin: user.repRangeMin,
              repRangeMax: user.repRangeMax,
              currentTargetReps,
              bestRepsDone,
              currentWorkingWeightKg: ww.workingWeightKg,
              weightStepKg: ww.exercise.weightStepKg ?? 2.5,
            },
          );

          ww.targetReps = nextTargetReps;
          ww.workingWeightKg = nextWorkingWeightKg;
          ww.repsDone = bestRepsDone;
          await this.workingWeightsRepository.save(ww);
        }
      }

      let schedule = await this.scheduleRepository.findOne({
        where: { user: { id: user.id } },
        relations: { user: true },
      });
      const weekStartDate = getWeekStartIsoDateMonday(now);
      if (!schedule) {
        schedule = this.scheduleRepository.create({
          user: { id: user.id } as User,
          weekStartDate,
          workoutsCompletedThisWeek: 0,
        });
      } else if (schedule.weekStartDate !== weekStartDate) {
        schedule.weekStartDate = weekStartDate;
        schedule.workoutsCompletedThisWeek = 0;
      }

      schedule.workoutsCompletedThisWeek += 1;
      schedule.nextWorkoutAt = computeNextWorkoutAt(now, user.trainingDays);

      const rotation = schedule.groupRotation ?? {};
      const plannedGroups = session.plannedMuscleGroups ?? [];
      const exercisesPerGroupPerWorkout = user.exercisesPerGroupPerWorkout ?? 1;

      const exercisesByGroup = new Map<MuscleGroup, typeof user.exercises>();
      for (const ex of user.exercises ?? []) {
        const group = ex.muscleGroup ?? MuscleGroup.Other;
        const arr = exercisesByGroup.get(group) ?? [];
        arr.push(ex);
        exercisesByGroup.set(group, arr);
      }

      for (const group of plannedGroups) {
        const total = exercisesByGroup.get(group)?.length ?? 0;
        if (total <= 1) continue;
        const current = Number((rotation as any)[group] ?? 0);
        const advance = Math.min(exercisesPerGroupPerWorkout, total);
        (rotation as any)[group] = (current + advance) % total;
      }
      schedule.groupRotation = rotation;
      await this.scheduleRepository.save(schedule);

      session.completedWorkingSets = workingSets.length;
      session.plannedWorkingSetsTotal = plannedTotal;
      session.isComplete =
        plannedTotal > 0 ? workingSets.length >= plannedTotal : workingSets.length > 0;
    }

    session.status = WorkoutStatus.Finished;
    session.finishedAt = now;
    await this.sessionsRepository.save(session);

    return {
      sessionId: session.id,
      status: session.status,
      finishedAt: session.finishedAt,
      isComplete: session.isComplete,
      isForceFinished: session.isForceFinished,
      completedWorkingSets: session.completedWorkingSets,
      plannedWorkingSetsTotal: session.plannedWorkingSetsTotal ?? 0,
    };
  }
}
