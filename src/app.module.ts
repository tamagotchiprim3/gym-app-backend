import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { Exercise } from './exercises/entities/exercise.entity';
import { ExercisesModule } from './exercises/exercises.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE,
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [Exercise],
      synchronize: true,
    } as TypeOrmModuleOptions),
    ExercisesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}