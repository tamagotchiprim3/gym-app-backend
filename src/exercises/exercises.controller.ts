import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';
import { MuscleGroup } from './interfaces/muscle-group';

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
      muscleGroup: payload.muscleGroup ?? MuscleGroup.Other,
      weightStepKg: payload.weightStepKg ?? 2.5,
      imageUrl: payload.imageUrl,
      isHazardous: payload.isHazardous,
    });
  }

  @Delete(':id')
  removeExercise(@Param('id', ParseIntPipe) id: number) {
    return this.exercisesService.remove(id);
  }
}
