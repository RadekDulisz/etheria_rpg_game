import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { JwtPayload, RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import { isTestAccount } from '../test-tools/test-accounts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  testToolsEnabled: boolean;
}

const REFRESH_REDIS_PREFIX = 'refresh:';
const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Logika uwierzytelniania: rejestracja, logowanie, odswiezanie i
 * uniewazniania tokenow, zmiana hasla. Hasla haszowane Argon2id (OWASP
 * Password Storage Cheat Sheet). Refresh tokeny dodatkowo rejestrowane
 * w Redis (jti -> userId), co pozwala je uniewazniac (logout, rotacja)
 * bez czekania na naturalne wygasniecie czystego JWT.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Konto z tym adresem e-mail już istnieje');
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.usersService.create(email, passwordHash);

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Nieprawidłowy adres e-mail lub hasło');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Nieprawidłowy adres e-mail lub hasło');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(refreshToken);

    const storedUserId = await this.redis.get(`${REFRESH_REDIS_PREFIX}${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Sesja wygasła lub została unieważniona');
    }

    // Rotacja: stary token uniewazniamy natychmiast, zanim wydamy nowy.
    await this.redis.del(`${REFRESH_REDIS_PREFIX}${payload.jti}`);

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Konto nie istnieje');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await this.redis.del(`${REFRESH_REDIS_PREFIX}${payload.jti}`);
    } catch {
      // Token juz nieprawidlowy/wygasly - wylogowanie i tak konczy sie
      // sukcesem z perspektywy uzytkownika (nic wiecej nie da sie uniewaznic).
    }
  }

  getSession(accessToken?: string | null): SessionUser | null {
    if (!accessToken) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        testToolsEnabled: isTestAccount(payload.email),
      };
    } catch {
      return null;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Aktualne hasło jest nieprawidłowe');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.usersService.updatePassword(userId, passwordHash);
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Nieprawidłowy token odświeżania sesji');
    }
  }

  private async issueTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as StringValue,
    });

    const jti = randomUUID();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshToken = this.jwtService.sign({ ...payload, jti } satisfies RefreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as StringValue,
    });

    await this.redis.set(
      `${REFRESH_REDIS_PREFIX}${jti}`,
      userId,
      'EX',
      this.parseExpiryToSeconds(refreshExpiresIn),
    );

    return { accessToken, refreshToken };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) {
      return DEFAULT_REFRESH_TTL_SECONDS;
    }
    const value = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * multipliers[unit];
  }
}
