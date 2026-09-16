import { CanActivate, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { UserProfile } from '@opticv/datatypes';
import type { UserModel } from '../../generated/prisma/models.js';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockProfile: UserProfile = {
  id: 'user-id',
  email: 'test@example.com',
  displayName: 'Jane Doe',
  avatarUrl: null,
  subscription: {
    tier: 'FREE',
    status: 'ACTIVE',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  },
  notifications: { productUpdatesEnabled: true, weeklyTipsEnabled: false },
};

const mockUser = {
  id: 'user-id',
  supabaseId: 'sb-id',
  email: 'test@example.com',
} as unknown as UserModel;

const mockUsersService = {
  getProfile: jest.fn().mockResolvedValue(mockProfile),
  updateDisplayName: jest.fn().mockResolvedValue(mockProfile),
  updateNotificationPreference: jest.fn().mockResolvedValue(mockProfile),
};

const mockConfigService = {
  getOrThrow: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(SupabaseGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('updateDisplayName', () => {
    it('delegates to service.updateDisplayName with supabaseId and dto', async () => {
      const dto = { displayName: 'Jane Doe' };

      const result = await controller.updateDisplayName(mockUser, dto);

      expect(mockUsersService.updateDisplayName).toHaveBeenCalledWith(
        mockUser.supabaseId,
        dto,
      );
      expect(result).toEqual(mockProfile);
    });

    it('propagates NotFoundException thrown by service', async () => {
      mockUsersService.updateDisplayName.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await expect(
        controller.updateDisplayName(mockUser, { displayName: 'Jane Doe' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNotificationPreference', () => {
    it('delegates to service.updateNotificationPreference with supabaseId and dto', async () => {
      const dto = { type: 'PRODUCT_UPDATES' as const, enabled: false };

      const result = await controller.updateNotificationPreference(
        mockUser,
        dto,
      );

      expect(
        mockUsersService.updateNotificationPreference,
      ).toHaveBeenCalledWith(mockUser.supabaseId, dto);
      expect(result).toEqual(mockProfile);
    });

    it('propagates NotFoundException thrown by service', async () => {
      mockUsersService.updateNotificationPreference.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await expect(
        controller.updateNotificationPreference(mockUser, {
          type: 'WEEKLY_TIPS',
          enabled: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
