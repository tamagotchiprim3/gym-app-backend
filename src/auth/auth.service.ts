import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Weekday } from '../users/types/weekday';
import { GymExperienceLevel } from '../users/types/gym-experience-level';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: User['role'];
    age: number;
    heightCm: number;
    weightKg: number;
    gymExperienceLevel: GymExperienceLevel;
    repRangeMin: number;
    repRangeMax: number;
    setsPerWeek: number;
    exerciseIds: number[];
    trainingDays: Weekday[];
  }) {
    const existing = await this.usersService.findByEmail(params.email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    if (typeof params.firstName !== 'string' || !params.firstName.trim()) {
      throw new BadRequestException('firstName is required');
    }
    if (typeof params.lastName !== 'string' || !params.lastName.trim()) {
      throw new BadRequestException('lastName is required');
    }

    const age = Number(params.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      throw new BadRequestException('Invalid age');
    }
    const heightCm = Number(params.heightCm);
    if (!Number.isInteger(heightCm) || heightCm < 50 || heightCm > 250) {
      throw new BadRequestException('Invalid heightCm');
    }
    const weightKg = Number(params.weightKg);
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
      throw new BadRequestException('Invalid weightKg');
    }
    const allowedLevels = new Set(Object.values(GymExperienceLevel));
    if (!allowedLevels.has(params.gymExperienceLevel)) {
      throw new BadRequestException('Invalid gymExperienceLevel');
    }

    const repRangeMin = Number(params.repRangeMin);
    if (!Number.isInteger(repRangeMin) || repRangeMin < 4 || repRangeMin > 20) {
      throw new BadRequestException('Invalid repRangeMin');
    }
    const repRangeMax = Number(params.repRangeMax);
    if (!Number.isInteger(repRangeMax) || repRangeMax < 4 || repRangeMax > 20) {
      throw new BadRequestException('Invalid repRangeMax');
    }
    if (repRangeMin > repRangeMax) {
      throw new BadRequestException('repRangeMin must be <= repRangeMax');
    }

    const setsPerWeek = Number(params.setsPerWeek);
    if (
      !Number.isInteger(setsPerWeek) ||
      setsPerWeek < 1 ||
      setsPerWeek > 1000
    ) {
      throw new BadRequestException('Invalid setsPerWeek');
    }

    if (!Array.isArray(params.trainingDays)) {
      throw new BadRequestException('trainingDays is required');
    }
    if (params.trainingDays.length === 0) {
      throw new BadRequestException(
        'trainingDays must contain at least one day',
      );
    }
    const allowedDays = new Set(Object.values(Weekday));
    if (params.trainingDays.some((day) => !allowedDays.has(day))) {
      throw new BadRequestException('Invalid trainingDays');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await this.usersService.createWithExerciseIds(
      {
        email: params.email,
        passwordHash,
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        role: params.role,
        age,
        heightCm,
        weightKg,
        gymExperienceLevel: params.gymExperienceLevel,
        repRangeMin,
        repRangeMax,
        setsPerWeek,
        trainingDays: Array.from(new Set(params.trainingDays)),
      },
      params.exerciseIds,
    );

    const accessToken = this.signToken(user);
    return { user: this.stripSensitive(user), accessToken };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signToken(user);
    return { user: this.stripSensitive(user), accessToken };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private signToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private stripSensitive(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
