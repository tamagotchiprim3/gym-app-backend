import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Weekday } from '../../users/types/weekday';
import { WorkoutSet } from './workout-set.entity';
import { MuscleGroup } from '../../exercises/interfaces/muscle-group';
import { WorkoutKind } from '../types/workout-kind';
import { WorkoutStatus } from '../types/workout-status';

@Entity()
export class WorkoutSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: WorkoutKind })
  kind: WorkoutKind;

  @Column({
    type: 'enum',
    enum: WorkoutStatus,
    default: WorkoutStatus.InProgress,
  })
  status: WorkoutStatus;

  @Column({ type: 'enum', enum: Weekday, nullable: true })
  plannedTrainingDay?: Weekday;

  @Column({ type: 'int', nullable: true })
  plannedWorkingSetsPerGroup?: number;

  @Column({ type: 'int', nullable: true })
  plannedWorkingSetsTotal?: number;

  @Column({ type: 'int', default: 0 })
  completedWorkingSets: number;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'boolean', default: false })
  isForceFinished: boolean;

  @Column({ type: 'json', nullable: true })
  plannedExerciseIds?: number[];

  @Column({ type: 'simple-array', nullable: true })
  plannedMuscleGroups?: MuscleGroup[];

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => WorkoutSet, (set) => set.session)
  sets: WorkoutSet[];
}
