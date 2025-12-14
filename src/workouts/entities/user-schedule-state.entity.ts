import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MuscleGroup } from '../../exercises/interfaces/muscle-group';

@Entity()
export class UserScheduleState {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'date' })
  weekStartDate: string;

  @Column({ type: 'int', default: 0 })
  workoutsCompletedThisWeek: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextWorkoutAt?: Date;

  @Column({ type: 'json', nullable: true })
  groupRotation?: Partial<Record<MuscleGroup, number>>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
