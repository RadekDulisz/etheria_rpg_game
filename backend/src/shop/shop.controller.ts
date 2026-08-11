import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PurchaseItemDto } from './dto/purchase-item.dto';
import { PurchaseCatalogItemDto } from './dto/purchase-catalog-item.dto';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { ShopService } from './shop.service';

@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('today')
  getTodayOffers(@CurrentUser() user: JwtPayload) {
    return this.shopService.getTodayOffers(user.sub);
  }

  @Get('refresh/status')
  getRefreshStatus(@CurrentUser() user: JwtPayload) {
    return this.shopService.getRefreshStatus(user.sub);
  }

  @Post('refresh')
  refreshMarket(@CurrentUser() user: JwtPayload) {
    return this.shopService.refreshMarket(user.sub);
  }

  @Get('catalog')
  getCatalog(@CurrentUser() user: JwtPayload, @Query() query: CatalogQueryDto) {
    return this.shopService.getCatalog(user.sub, query);
  }

  @Get('catalog/summary')
  getCatalogSummary() {
    return this.shopService.getCatalogSummary();
  }

  @Post('purchase')
  async purchase(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PurchaseItemDto,
  ): Promise<{ status: string }> {
    await this.shopService.purchase(user.sub, dto.shopEntryId, dto.quantity);
    return { status: 'ok' };
  }


  @Post('catalog/purchase')
  async purchaseCatalogItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PurchaseCatalogItemDto,
  ): Promise<{ status: string }> {
    await this.shopService.purchaseCatalogItem(user.sub, dto.itemId, dto.quantity);
    return { status: 'ok' };
  }
}
