import { Body, Controller, Get, Param, ParseEnumPipe, Post, UseGuards } from '@nestjs/common';
import { TavernProvisionType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TavernService } from './tavern.service';
import { ChooseTavernPathDto } from './dto/choose-tavern-path.dto';
import { AcceptTavernOfferDto } from './dto/accept-tavern-offer.dto';
import { PurchaseProvisionDto } from './dto/purchase-provision.dto';
import { UseProvisionDto } from './dto/use-provision.dto';
import { SolveTavernPuzzleDto } from './dto/solve-tavern-puzzle.dto';

@UseGuards(JwtAuthGuard)
@Controller('tavern')
export class TavernController {
  constructor(private readonly tavernService: TavernService) {}

  @Get()
  getTavern(@CurrentUser() user: JwtPayload) {
    return this.tavernService.getTavern(user.sub);
  }

  @Post('refresh')
  refreshBoard(@CurrentUser() user: JwtPayload) {
    return this.tavernService.refreshBoard(user.sub);
  }

  @Post('offers/:offerId/accept')
  acceptOffer(@CurrentUser() user: JwtPayload, @Param('offerId') offerId: string, @Body() dto: AcceptTavernOfferDto) {
    return this.tavernService.acceptOffer(user.sub, offerId, dto);
  }

  @Post('provisions/:type/purchase')
  purchaseProvision(
    @CurrentUser() user: JwtPayload,
    @Param('type', new ParseEnumPipe(TavernProvisionType)) type: TavernProvisionType,
    @Body() dto: PurchaseProvisionDto,
  ) {
    return this.tavernService.purchaseProvision(user.sub, type, dto);
  }

  @Get('quests/active')
  getActiveQuest(@CurrentUser() user: JwtPayload) {
    return this.tavernService.getCurrentQuest(user.sub);
  }

  @Post('quests/active/choose')
  choosePath(@CurrentUser() user: JwtPayload, @Body() dto: ChooseTavernPathDto) {
    return this.tavernService.choosePath(user.sub, dto);
  }

  @Post('quests/active/use-provision')
  useProvision(@CurrentUser() user: JwtPayload, @Body() dto: UseProvisionDto) {
    return this.tavernService.useProvision(user.sub, dto);
  }

  @Post('quests/active/fight')
  fightEncounter(@CurrentUser() user: JwtPayload) {
    return this.tavernService.fightEncounter(user.sub);
  }

  @Post('quests/active/puzzle')
  solvePuzzle(@CurrentUser() user: JwtPayload, @Body() dto: SolveTavernPuzzleDto) {
    return this.tavernService.solvePuzzle(user.sub, dto);
  }

  @Post('quests/active/claim')
  claimQuest(@CurrentUser() user: JwtPayload) {
    return this.tavernService.claimQuest(user.sub);
  }

  @Post('quests/active/abandon')
  abandonQuest(@CurrentUser() user: JwtPayload) {
    return this.tavernService.abandonQuest(user.sub);
  }
}
