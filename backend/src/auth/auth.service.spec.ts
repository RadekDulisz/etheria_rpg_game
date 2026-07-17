import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updatePassword: jest.Mock;
  };
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
    };
    redis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.token'), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def?: unknown) => def ?? 'mock-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('tworzy uzytkownika i zwraca pare tokenow, gdy e-mail jest wolny', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
      });

      const result = await service.register('test@example.com', 'Password123');

      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('signed.token');
      expect(result.refreshToken).toBe('signed.token');
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('rzuca ConflictException, gdy e-mail jest juz zajety', async () => {
      usersService.findByEmail.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.register('test@example.com', 'Password123')).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('zwraca tokeny dla poprawnego hasla', async () => {
      const passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });
      usersService.findByEmail.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        passwordHash,
        deletedAt: null,
      });

      const result = await service.login('test@example.com', 'Password123');

      expect(result.accessToken).toBe('signed.token');
    });

    it('rzuca UnauthorizedException dla nieistniejacego uzytkownika', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);

      await expect(service.login('brak@example.com', 'Password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rzuca UnauthorizedException dla blednego hasla', async () => {
      const passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });
      usersService.findByEmail.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        passwordHash,
        deletedAt: null,
      });

      await expect(service.login('test@example.com', 'ZlaHaslo123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rzuca UnauthorizedException dla konta oznaczonego jako usuniete (soft-delete)', async () => {
      const passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });
      usersService.findByEmail.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        passwordHash,
        deletedAt: new Date(),
      });

      await expect(service.login('test@example.com', 'Password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('wydaje nowa pare tokenow i uniewaznia stary refresh token (rotacja)', async () => {
      jwtService.verify.mockReturnValueOnce({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        jti: 'jti-1',
      });
      redis.get.mockResolvedValueOnce('user-1');
      usersService.findById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        deletedAt: null,
      });

      const result = await service.refresh('some.refresh.token');

      expect(redis.del).toHaveBeenCalledWith('refresh:jti-1');
      expect(result.accessToken).toBe('signed.token');
    });

    it('rzuca UnauthorizedException, gdy refresh token nie istnieje juz w Redis', async () => {
      jwtService.verify.mockReturnValueOnce({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'PLAYER',
        jti: 'jti-1',
      });
      redis.get.mockResolvedValueOnce(null);

      await expect(service.refresh('some.refresh.token')).rejects.toThrow(UnauthorizedException);
    });

    it('rzuca UnauthorizedException dla niepoprawnego/wygasniego tokenu JWT', async () => {
      jwtService.verify.mockImplementationOnce(() => {
        throw new Error('token expired');
      });

      await expect(service.refresh('zle.podpisany.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('aktualizuje haslo, gdy aktualne haslo jest poprawne', async () => {
      const passwordHash = await argon2.hash('OldPassword123', { type: argon2.argon2id });
      usersService.findById.mockResolvedValueOnce({ id: 'user-1', passwordHash });

      await service.changePassword('user-1', 'OldPassword123', 'NewPassword123');

      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', expect.any(String));
    });

    it('rzuca UnauthorizedException, gdy aktualne haslo jest bledne', async () => {
      const passwordHash = await argon2.hash('OldPassword123', { type: argon2.argon2id });
      usersService.findById.mockResolvedValueOnce({ id: 'user-1', passwordHash });

      await expect(
        service.changePassword('user-1', 'ZleHaslo123', 'NewPassword123'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });
});
