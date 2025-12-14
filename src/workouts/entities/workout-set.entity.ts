import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { User } from '../../users/entities/user.entity';
import { WorkoutSession } from './workout-session.entity';
import { WorkoutSetType } from '../types/workout-set-type';

@Entity()
export class WorkoutSet {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WorkoutSession, (session) => session.sets, {
    onDelete: 'CASCADE',
  })
  session: WorkoutSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  exercise: Exercise;

  @Column({ type: 'enum', enum: WorkoutSetType })
  setType: WorkoutSetType;

  @Column({ type: 'float' })
  weightKg: number;

  @Column({ type: 'int' })
  repsDone: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}