import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const usersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const exercisesRepository = {
    find: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UsersService(usersRepository as any, exercisesRepository as any);
  });

  describe('createWithExerciseIds', () => {
    it('throws when exerciseIds is empty', async () => {
      await expect(
        service.createWithExerciseIds(
          {
            email: 'a@b.com',
            firstName: 'A',
            lastName: 'B',
            passwordHash: 'hash',
          },
          [],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(exercisesRepository.find).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });
});
