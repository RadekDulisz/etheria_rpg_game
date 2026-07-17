import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BuyPropertyDto } from './dto/buy-property.dto';
import { PropertiesService, PropertyResponse, PropertyUpgradeResponse } from './properties.service';

@UseGuards(JwtAuthGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post('me/buy')
  buy(@CurrentUser() user: JwtPayload, @Body() dto: BuyPropertyDto): Promise<PropertyResponse> {
    return this.propertiesService.buyProperty(user.sub, dto);
  }

  @Get('me')
  getMine(@CurrentUser() user: JwtPayload): Promise<PropertyResponse | null> {
    return this.propertiesService.getMyProperty(user.sub);
  }

  @Post('me/upgrade')
  upgrade(@CurrentUser() user: JwtPayload): Promise<PropertyResponse> {
    return this.propertiesService.upgradeMyProperty(user.sub);
  }

  @Post('me/collect')
  collect(@CurrentUser() user: JwtPayload): Promise<PropertyResponse> {
    return this.propertiesService.collectIncome(user.sub);
  }

  @Post('me/restore')
  restore(@CurrentUser() user: JwtPayload): Promise<PropertyResponse> {
    return this.propertiesService.restoreHealth(user.sub);
  }

  @Get('me/upgrades')
  listUpgrades(@CurrentUser() user: JwtPayload): Promise<PropertyUpgradeResponse[]> {
    return this.propertiesService.listPropertyUpgrades(user.sub);
  }
}
