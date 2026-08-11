import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EquipmentSlot } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EquipItemDto } from './dto/equip-item.dto';
import { SellItemDto } from './dto/sell-item.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard)
@Controller('characters/me')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory')
  getInventory(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getInventory(user.sub);
  }

  @Get('inventory/gems')
  getGems(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getGems(user.sub);
  }

  @Get('equipment')
  getEquipment(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getEquipment(user.sub);
  }

  @Post('equipment')
  equip(@CurrentUser() user: JwtPayload, @Body() dto: EquipItemDto) {
    return this.inventoryService.equipItem(user.sub, dto.ownedItemId, dto.slot);
  }

  @Post('inventory/:ownedItemId/sell')
  sell(
    @CurrentUser() user: JwtPayload,
    @Param('ownedItemId') ownedItemId: string,
    @Body() dto: SellItemDto,
  ) {
    return this.inventoryService.sellItem(user.sub, ownedItemId, dto.quantity);
  }

  @Delete('equipment/:slot')
  unequip(
    @CurrentUser() user: JwtPayload,
    @Param('slot', new ParseEnumPipe(EquipmentSlot)) slot: EquipmentSlot,
  ) {
    return this.inventoryService.unequipSlot(user.sub, slot);
  }
}
