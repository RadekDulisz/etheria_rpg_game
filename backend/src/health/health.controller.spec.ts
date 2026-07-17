import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let redis: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    redis = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('zwraca status "ok", gdy baza danych i Redis sa dostepne', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    redis.ping.mockResolvedValueOnce('PONG');

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.services).toEqual({ database: 'up', redis: 'up' });
  });

  it('zwraca status "degraded", gdy baza danych jest niedostepna', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    redis.ping.mockResolvedValueOnce('PONG');

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });

  it('zwraca status "degraded", gdy Redis jest niedostepny', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    redis.ping.mockRejectedValueOnce(new Error('connection refused'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.services.redis).toBe('down');
  });
});
