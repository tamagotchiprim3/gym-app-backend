import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkoutsService } from './workouts.service';
import { WorkoutSetType } from './types/workout-set-type';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post('init/start')
  startInit(@Req() req: any) {
    return this.workoutsService.startInit(req.user);
  }

  @Post('regular/start')
  startRegular(@Req() req: any, @Body() payload?: { force?: boolean }) {
    return this.workoutsService.startRegular(req.user, {
      force: Boolean(payload?.force),
    });
  }

  @Post(':sessionId/sets')
  addSet(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body()
    payload: {
      exerciseId: number;
      setType: WorkoutSetType;
      repsDone: number;
      weightKg?: number;
    },
  ) {
    if (!payload || !payload.setType) {
      throw new BadRequestException('setType is required');
    }
    return this.workoutsService.addSet(req.user, sessionId, payload);
  }

  @Post(':sessionId/finish')
  finish(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() payload?: { force?: boolean },
  ) {
    return this.workoutsService.finish(req.user, sessionId, {
      force: Boolean(payload?.force),
    });
  }
}
