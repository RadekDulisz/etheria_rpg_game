import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateGuildDto } from './dto/create-guild.dto';
import {
  GuildDetailsResponse,
  GuildSummaryResponse,
  GuildWarDetailsResponse,
  GuildWarSummaryResponse,
  GuildsService,
} from './guilds.service';

@UseGuards(JwtAuthGuard)
@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGuildDto,
  ): Promise<GuildDetailsResponse> {
    return this.guildsService.createGuild(user.sub, dto);
  }

  @Get()
  list(): Promise<GuildSummaryResponse[]> {
    return this.guildsService.listGuilds();
  }

  @Get('me')
  getMine(@CurrentUser() user: JwtPayload): Promise<GuildDetailsResponse | null> {
    return this.guildsService.getMyGuild(user.sub);
  }

  @Post(':id/join')
  join(
    @CurrentUser() user: JwtPayload,
    @Param('id') guildId: string,
  ): Promise<GuildDetailsResponse> {
    return this.guildsService.joinGuild(user.sub, guildId);
  }

  @Post('me/leave')
  leave(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.guildsService.leaveGuild(user.sub);
  }

  @Post('me/leadership/:characterId')
  transferLeadership(
    @CurrentUser() user: JwtPayload,
    @Param('characterId') characterId: string,
  ): Promise<GuildDetailsResponse> {
    return this.guildsService.transferLeadership(user.sub, characterId);
  }

  @Delete('me/members/:characterId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('characterId') characterId: string,
  ): Promise<GuildDetailsResponse> {
    return this.guildsService.removeMember(user.sub, characterId);
  }

  @Post('me/wars/:targetGuildId')
  declareWar(
    @CurrentUser() user: JwtPayload,
    @Param('targetGuildId') targetGuildId: string,
  ): Promise<GuildWarDetailsResponse> {
    return this.guildsService.declareGuildWar(user.sub, targetGuildId);
  }

  @Get('me/wars')
  listMyWars(@CurrentUser() user: JwtPayload): Promise<GuildWarSummaryResponse[]> {
    return this.guildsService.listMyGuildWars(user.sub);
  }

  @Get('wars')
  listWars(): Promise<GuildWarSummaryResponse[]> {
    return this.guildsService.listGuildWars();
  }

  @Get('wars/:id')
  getWar(@Param('id') id: string): Promise<GuildWarDetailsResponse> {
    return this.guildsService.getGuildWarById(id);
  }

  @Post('wars/:id/resolve')
  resolveWar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<GuildWarDetailsResponse> {
    return this.guildsService.resolveGuildWar(user.sub, id);
  }

  @Post('wars/:id/end')
  finishWar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('winnerGuildId') winnerGuildId?: string,
    @Body('summary') summary?: string,
  ): Promise<GuildWarDetailsResponse> {
    return this.guildsService.finishGuildWar(user.sub, id, winnerGuildId, summary);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<GuildDetailsResponse> {
    return this.guildsService.getGuildById(id);
  }
}
