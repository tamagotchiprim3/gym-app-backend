import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ExerciseType } from '../interfaces/execise-type';
import { ExerciseLevel } from '../interfaces/exercise-level';
import { MuscleGroup } from '../interfaces/muscle-group';

@Entity()
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ExerciseLevel })
  level: ExerciseLevel;

  @Column({ type: 'enum', enum: ExerciseType, nullable: true })
  type?: ExerciseType;

  @Column({ type: 'enum', enum: MuscleGroup, default: MuscleGroup.Other })
  muscleGroup: MuscleGroup;

  @Column({ type: 'float', default: 2.5 })
  weightStepKg: number;

  @Column({ nullable: true })
  exerciseGif?: string;

  @Column({ default: false })
  isHazardous: boolean;
}
