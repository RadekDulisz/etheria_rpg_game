import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BattlesService } from './battles.service';

@UseGuards(JwtAuthGuard)
@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Post('arena/opponent')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getArenaOpponent(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      excludeOpponentId?: string;
      alignment?: 'GOOD' | 'EVIL';
    } = {},
  ) {
    return this.battlesService.getArenaOpponent(
      user.sub,
      Math.random,
      body.excludeOpponentId,
      body.alignment,
    );
  }

  @Post('arena/:botId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  fightArena(@CurrentUser() user: JwtPayload, @Param('botId') botId: string) {
    return this.battlesService.fightBot(user.sub, botId, Math.random, true);
  }

  @Post('pve/:botId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  fightBot(@CurrentUser() user: JwtPayload, @Param('botId') botId: string) {
    return this.battlesService.fightBot(user.sub, botId);
  }

  @Post('pvp/:targetCharacterId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  fightPlayer(
    @CurrentUser() user: JwtPayload,
    @Param('targetCharacterId') targetCharacterId: string,
  ) {
    return this.battlesService.fightPlayer(user.sub, targetCharacterId);
  }

  @Get('arena/profile')
  getArenaProfile(@CurrentUser() user: JwtPayload) {
    return this.battlesService.getArenaProfile(user.sub);
  }

  @Get(':id')
  getBattle(@Param('id') id: string) {
    return this.battlesService.getById(id);
  }
}
