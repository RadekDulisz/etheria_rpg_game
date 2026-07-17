import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MissionsService } from './missions.service';
import { EmbarkMissionDto } from './dto/embark-mission.dto';

@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.missionsService.getOverview(user.sub);
  }

  @Post('embark')
  embark(@CurrentUser() user: JwtPayload, @Body() dto: EmbarkMissionDto) {
    return this.missionsService.embark(user.sub, dto.morality);
  }
}
