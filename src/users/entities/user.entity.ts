import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { UserRole } from '../types/user-role';
import { Weekday } from '../types/weekday';
import { GymExperienceLevel } from '../types/gym-experience-level';
import { TrainingMode } from '../types/training-mode';
import { MuscleGroup } from '../../exercises/interfaces/muscle-group';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role: UserRole;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'int' })
  heightCm: number;

  @Column({ type: 'float' })
  weightKg: number;

  @Column({ type: 'enum', enum: GymExperienceLevel })
  gymExperienceLevel: GymExperienceLevel;

  @Column({ type: 'int' })
  repRangeMin: number;

  @Column({ type: 'int' })
  repRangeMax: number;

  @Column({ type: 'int', name: 'workingSetsPerGroupPerWeek' })
  setsPerGroupPerWeek: number;

  @Column({ type: 'simple-array' })
  trainingDays: Weekday[];

  @Column({ type: 'enum', enum: TrainingMode })
  trainingMode: TrainingMode;

  @Column({ type: 'int' })
  exercisesPerGroupPerWorkout: number;

  @Column({ type: 'json', nullable: true })
  splitDays?: Partial<Record<Weekday, MuscleGroup[]>>;

  @ManyToMany(() => Exercise, { cascade: false })
  @JoinTable({
    name: 'user_exercises',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'exerciseId', referencedColumnName: 'id' },
  })
  exercises?: Exercise[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
