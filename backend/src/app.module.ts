import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BattlesModule } from './battles/battles.module';
import { CharactersModule } from './characters/characters.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { GuildsModule } from './guilds/guilds.module';
import { AdminModule } from './admin/admin.module';
import { PropertiesModule } from './properties/properties.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ShopModule } from './shop/shop.module';
import { UsersModule } from './users/users.module';
import { MissionsModule } from './missions/missions.module';
import { BlacksmithModule } from './blacksmith/blacksmith.module';
import { TestToolsModule } from './test-tools/test-tools.module';
import { JewelerModule } from './jeweler/jeweler.module';
import { TavernModule } from './tavern/tavern.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Globalny limit jako siatka bezpieczenstwa; ostrzejsze limity per
    // endpoint (login/register) ustawione lokalnie dekoratorem @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    CharactersModule,
    InventoryModule,
    GuildsModule,
    AdminModule,
    PropertiesModule,
    ShopModule,
    BattlesModule,
    HealthModule,
    MissionsModule,
    BlacksmithModule,
    JewelerModule,
    TavernModule,
    TestToolsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
