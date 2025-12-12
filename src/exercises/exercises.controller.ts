import { Body, Controller, Get, Post } from '@nestjs/common';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  getExercises(): Promise<Exercise[]> {
    return this.exercisesService.findAll();
  }

  @Post()
  addExercise(
    @Body()
    payload: Omit<Exercise, 'id'>,
  ): Promise<Exercise> {
    return this.exercisesService.create({
      name: payload.name,
      level: payload.level,
      type: payload.type,
      imageUrl: payload.imageUrl,
      isHazardous: payload.isHazardous,
    });
  }
}