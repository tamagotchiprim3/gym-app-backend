import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Exercise)
    private readonly exercisesRepository: Repository<Exercise>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
      relations: { exercises: true },
    });
  }

  findById(id: number) {
    return this.usersRepository.findOne({
      where: { id },
      relations: { exercises: true },
    });
  }

  async create(userData: Partial<User>) {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async createWithExerciseIds(
    userData: Omit<Partial<User>, 'exercises'>,
    exerciseIds: number[],
  ) {
    if (!Array.isArray(exerciseIds)) {
      throw new BadRequestException('exerciseIds is required');
    }
    if (exerciseIds.length === 0) {
      throw new BadRequestException('exerciseIds must contain at least one id');
    }

    const ids = exerciseIds;
    const parsedIds = ids.map((id) => Number(id));
    if (parsedIds.some((id) => !Number.isInteger(id))) {
      throw new BadRequestException('Invalid exerciseIds');
    }
    const normalizedIds = Array.from(new Set(parsedIds));

    const exercises = normalizedIds.length
      ? await this.exercisesRepository.find({
          where: { id: In(normalizedIds) },
        })
      : [];

    if (normalizedIds.length && exercises.length !== normalizedIds.length) {
      throw new BadRequestException('Some exercises were not found');
    }

    const user = this.usersRepository.create({
      ...userData,
      exercises,
    });
    return this.usersRepository.save(user);
  }
}
