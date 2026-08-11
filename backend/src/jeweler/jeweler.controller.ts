import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CombineGemsDto } from './dto/combine-gems.dto';
import { ExtractGemDto } from './dto/extract-gem.dto';
import { JewelerService } from './jeweler.service';

@UseGuards(JwtAuthGuard)
@Controller('jeweler')
export class JewelerController {
  constructor(private readonly jewelerService: JewelerService) {}

  @Get('workshop')
  getWorkshop(@CurrentUser() user: JwtPayload) {
    return this.jewelerService.getWorkshop(user.sub);
  }

  @Post('combine')
  combine(@CurrentUser() user: JwtPayload, @Body() dto: CombineGemsDto) {
    return this.jewelerService.combine(user.sub, dto);
  }

  @Post('extract')
  extract(@CurrentUser() user: JwtPayload, @Body() dto: ExtractGemDto) {
    return this.jewelerService.extract(user.sub, dto);
  }
}
