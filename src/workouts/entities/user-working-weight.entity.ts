import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
@Index(['user', 'exercise'], { unique: true })
export class UserWorkingWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  exercise: Exercise;

  @Column({ type: 'float' })
  workingWeightKg: number;

  @Column({ type: 'int' })
  repsDone: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

