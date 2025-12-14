import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/types/user-role';
import { Weekday } from '../users/types/weekday';
import { GymExperienceLevel } from '../users/types/gym-experience-level';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: UserRole;
      age: number;
      heightCm: number;
      weightKg: number;
      gymExperienceLevel: GymExperienceLevel;
      repRangeMin: number;
      repRangeMax: number;
      setsPerWeek: number;
      exerciseIds: number[];
      trainingDays: Weekday[];
    },
  ) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(
    @Body() payload: { email: string; password: string },
  ): Promise<{ user: unknown; accessToken: string }> {
    return this.authService.login(payload.email, payload.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    const { passwordHash, ...rest } = req.user;
    return rest;
  }
}
