import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { GymExperienceLevel } from '../users/types/gym-experience-level';
import { Weekday } from '../users/types/weekday';
import { TrainingMode } from '../users/types/training-mode';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'hashed'),
  compare: jest.fn(async () => true),
}));

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createWithExerciseIds: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(() => 'token'),
  } satisfies Partial<JwtService>;

  let service: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthService(usersService as any, jwtService as any);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createWithExerciseIds.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'user',
      passwordHash: 'hashed',
      repRangeMin: 6,
      repRangeMax: 12,
      setsPerGroupPerWeek: 12,
      trainingMode: TrainingMode.FullBody,
      exercisesPerGroupPerWorkout: 1,
      trainingDays: [Weekday.Mon],
    });
  });

  it('rejects when trainingDays is missing', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: GymExperienceLevel.Beginner,
        repRangeMin: 6,
        repRangeMax: 12,
        setsPerGroupPerWeek: 12,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects when trainingDays is empty', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: GymExperienceLevel.Beginner,
        repRangeMin: 6,
        repRangeMax: 12,
        setsPerGroupPerWeek: 12,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
        trainingDays: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects when trainingDays contains invalid values', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: GymExperienceLevel.Beginner,
        repRangeMin: 6,
        repRangeMax: 12,
        setsPerGroupPerWeek: 12,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
        trainingDays: ['monday'] as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects when gymExperienceLevel is invalid', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: 'expert' as any,
        repRangeMin: 6,
        repRangeMax: 12,
        setsPerGroupPerWeek: 12,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
        trainingDays: ['mon'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects when repRangeMin is greater than repRangeMax', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: GymExperienceLevel.Beginner,
        repRangeMin: 12,
        repRangeMax: 6,
        setsPerGroupPerWeek: 12,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
        trainingDays: ['mon'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('rejects when setsPerGroupPerWeek is invalid', async () => {
    await expect(
      service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        heightCm: 180,
        weightKg: 80,
        gymExperienceLevel: GymExperienceLevel.Beginner,
        repRangeMin: 6,
        repRangeMax: 12,
        setsPerGroupPerWeek: 0,
        trainingMode: TrainingMode.FullBody,
        exercisesPerGroupPerWorkout: 1,
        exerciseIds: [1],
        trainingDays: ['mon'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});
