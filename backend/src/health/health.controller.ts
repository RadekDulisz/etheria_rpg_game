import { Controller, Get, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthResponseDto, ServiceStatus } from './dto/health-response.dto';

/**
 * Endpoint stanu aplikacji. Sprawdza dostepnosc backendu oraz jego
 * bezposrednich zaleznosci (PostgreSQL, Redis). Nie wymaga autoryzacji,
 * poniewaz jest wywolywany przez infrastrukture (healthcheck, load balancer).
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HttpCode(200)
  async check(): Promise<HealthResponseDto> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const allUp = database === 'up' && redis === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database, redis },
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
