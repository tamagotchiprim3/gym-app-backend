import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { Exercise } from './exercises/entities/exercise.entity';
import { ExercisesModule } from './exercises/exercises.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { WorkoutsModule } from './workouts/workouts.module';
import { WorkoutSession } from './workouts/entities/workout-session.entity';
import { WorkoutSet } from './workouts/entities/workout-set.entity';
import { UserWorkingWeight } from './workouts/entities/user-working-weight.entity';
import { UserScheduleState } from './workouts/entities/user-schedule-state.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE,
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [
        Exercise,
        User,
        WorkoutSession,
        WorkoutSet,
        UserWorkingWeight,
        UserScheduleState,
      ],
      synchronize: true,
    } as TypeOrmModuleOptions),
    AuthModule,
    ExercisesModule,
    UsersModule,
    WorkoutsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
