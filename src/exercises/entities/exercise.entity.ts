import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ExerciseType } from '../interfaces/execise-type';
import { ExerciseLevel } from '../interfaces/exercise-level';

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

  @Column()
  imageUrl: string;

  @Column({ default: false })
  isHazardous: boolean;
}