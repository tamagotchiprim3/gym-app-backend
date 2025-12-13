import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  findAll() {
    return this.exerciseRepository.find();
  }

  create(data: Partial<Exercise>) {
    const exercise = this.exerciseRepository.create(data);
    return this.exerciseRepository.save(exercise);
  }

  remove(id: number) {
    return this.exerciseRepository.delete(id);
  }
}
