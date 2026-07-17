import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { CreateBotDto, UpdateBotDto } from './dto/admin-bots.dto';
import { CreateItemDto, UpdateItemDto } from './dto/admin-items.dto';
import {
  AdminBotResponse,
  AdminItemResponse,
  AdminService,
  BalanceAdjustmentResponse,
} from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('items')
  listItems(): Promise<AdminItemResponse[]> {
    return this.adminService.listItems();
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto): Promise<AdminItemResponse> {
    return this.adminService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto): Promise<AdminItemResponse> {
    return this.adminService.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteItem(id);
  }

  @Get('bots')
  listBots(): Promise<AdminBotResponse[]> {
    return this.adminService.listBots();
  }

  @Post('bots')
  createBot(@Body() dto: CreateBotDto): Promise<AdminBotResponse> {
    return this.adminService.createBot(dto);
  }

  @Patch('bots/:id')
  updateBot(@Param('id') id: string, @Body() dto: UpdateBotDto): Promise<AdminBotResponse> {
    return this.adminService.updateBot(id, dto);
  }

  @Delete('bots/:id')
  deleteBot(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteBot(id);
  }

  @Post('characters/:id/balance')
  adjustBalance(
    @Param('id') characterId: string,
    @Body() dto: AdjustBalanceDto,
  ): Promise<BalanceAdjustmentResponse> {
    return this.adminService.adjustCharacterBalance(characterId, dto);
  }
}
