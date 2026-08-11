import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BlacksmithService } from './blacksmith.service';
import { InsertGemDto } from './dto/insert-gem.dto';
import { OwnedItemDto } from './dto/owned-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('blacksmith')
export class BlacksmithController {
  constructor(private readonly blacksmithService: BlacksmithService) {}

  @Get('workshop')
  getWorkshop(@CurrentUser() user: JwtPayload) {
    return this.blacksmithService.getWorkshop(user.sub);
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: JwtPayload, @Body() dto: OwnedItemDto) {
    return this.blacksmithService.upgrade(user.sub, dto.ownedItemId);
  }

  @Post('sockets/unlock')
  unlockSocket(@CurrentUser() user: JwtPayload, @Body() dto: OwnedItemDto) {
    return this.blacksmithService.unlockSocket(user.sub, dto.ownedItemId);
  }

  @Post('sockets/insert')
  insertGem(@CurrentUser() user: JwtPayload, @Body() dto: InsertGemDto) {
    return this.blacksmithService.insertGem(user.sub, dto);
  }
}
