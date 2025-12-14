import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { UserWorkingWeight } from './entities/user-working-weight.entity';
import { UserScheduleState } from './entities/user-schedule-state.entity';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutSession,
      WorkoutSet,
      UserWorkingWeight,
      UserScheduleState,
    ]),
    UsersModule,
  ],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}

