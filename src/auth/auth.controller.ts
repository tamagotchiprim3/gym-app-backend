import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
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
      name: string;
      role?: UserRole;
      exerciseIds: number[];
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