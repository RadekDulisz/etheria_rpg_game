import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Klient Redis wykorzystywany m.in. do sesji, cooldownow ataku,
 * rankingow oraz kolejek walk (patrz sekcja 5.3 instrukcji projektowych).
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
