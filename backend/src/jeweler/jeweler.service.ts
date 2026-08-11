import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GemDefinition, GemTier } from '@prisma/client';
import { toOwnedItemResponse } from '../blacksmith/blacksmith.balance';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { CombineGemsDto } from './dto/combine-gems.dto';
import { ExtractGemDto } from './dto/extract-gem.dto';
import {
  calculateGemCombineCost,
  calculateGemExtractionCost,
  GEM_COMBINE_RATIO,
  GEM_EXTRACTION_COST,
  nextGemTier,
} from './jeweler.balance';

const SOCKETED_ITEM_INCLUDE = {
  item: true,
  equippedEntry: true,
  sockets: {
    include: { gemDefinition: true },
    orderBy: { position: 'asc' as const },
  },
} as const;

@Injectable()
export class JewelerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getWorkshop(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const [gems, gemCatalog, socketedItems] = await Promise.all([
      this.prisma.gemStack.findMany({
        where: { combatantId: character.combatantId, quantity: { gt: 0 } },
        include: { gemDefinition: true },
        orderBy: { gemDefinition: { minLevel: 'asc' } },
      }),
      this.prisma.gemDefinition.findMany({
        orderBy: [{ family: 'asc' }, { minLevel: 'asc' }],
      }),
      this.prisma.ownedItem.findMany({
        where: {
          combatantId: character.combatantId,
          sockets: { some: { gemDefinitionId: { not: null } } },
        },
        include: SOCKETED_ITEM_INCLUDE,
        orderBy: [{ enhancementLevel: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      gold: character.gold.toString(),
      characterLevel: character.level,
      gems,
      gemCatalog,
      recipes: this.buildRecipes(gemCatalog),
      extractionCosts: Object.fromEntries(
        Object.entries(GEM_EXTRACTION_COST).map(([tier, cost]) => [tier, cost.toString()]),
      ),
      socketedItems: socketedItems.map((item) => ({
        ...toOwnedItemResponse(item),
        equippedSlot: item.equippedEntry?.slot ?? null,
      })),
    };
  }

  async combine(userId: string, dto: CombineGemsDto) {
    const character = await this.charactersService.getByUserId(userId);
    const inputGem = await this.prisma.gemDefinition.findUnique({
      where: { id: dto.gemDefinitionId },
    });
    if (!inputGem) throw new NotFoundException('Nie znaleziono wybranego klejnotu');

    const resultTier = nextGemTier(inputGem.tier);
    if (!resultTier) {
      throw new BadRequestException('Szlif szmaragdowy jest najwyższym dostępnym szlifem');
    }
    const resultGem = await this.prisma.gemDefinition.findUnique({
      where: { family_tier: { family: inputGem.family, tier: resultTier } },
    });
    if (!resultGem) throw new NotFoundException('Nie znaleziono rezultatu tej receptury');

    const consumedQuantity = GEM_COMBINE_RATIO * dto.count;
    const goldCost = calculateGemCombineCost(resultTier, dto.count);

    const balanceAfter = await this.prisma.$transaction(async (tx) => {
      const spentGold = await tx.character.updateMany({
        where: { id: character.id, gold: { gte: goldCost } },
        data: { gold: { decrement: goldCost } },
      });
      if (spentGold.count !== 1) throw new ConflictException('Masz za mało złota');

      const consumed = await tx.gemStack.updateMany({
        where: {
          combatantId: character.combatantId,
          gemDefinitionId: inputGem.id,
          quantity: { gte: consumedQuantity },
        },
        data: { quantity: { decrement: consumedQuantity } },
      });
      if (consumed.count !== 1) {
        throw new ConflictException(`Potrzebujesz ${consumedQuantity} sztuk wybranego klejnotu`);
      }

      await tx.gemStack.upsert({
        where: {
          combatantId_gemDefinitionId: {
            combatantId: character.combatantId,
            gemDefinitionId: resultGem.id,
          },
        },
        create: {
          combatantId: character.combatantId,
          gemDefinitionId: resultGem.id,
          quantity: dto.count,
        },
        update: { quantity: { increment: dto.count } },
      });
      await tx.gemStack.deleteMany({
        where: {
          combatantId: character.combatantId,
          gemDefinitionId: inputGem.id,
          quantity: 0,
        },
      });
      const updatedCharacter = await tx.character.findUniqueOrThrow({
        where: { id: character.id },
        select: { gold: true },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'JEWELER_GEM_COMBINE',
          amount: -goldCost,
          balanceAfter: updatedCharacter.gold,
          referenceId: resultGem.id,
          description: `Połączenie ${consumedQuantity} × ${inputGem.name} w ${dto.count} × ${resultGem.name}`,
        },
      });
      return updatedCharacter.gold;
    });

    return {
      success: true,
      inputGem,
      resultGem,
      consumedQuantity,
      createdQuantity: dto.count,
      goldCost: goldCost.toString(),
      balanceAfter: balanceAfter.toString(),
    };
  }

  async extract(userId: string, dto: ExtractGemDto) {
    const character = await this.charactersService.getByUserId(userId);
    const ownedItem = await this.prisma.ownedItem.findFirst({
      where: { id: dto.ownedItemId, combatantId: character.combatantId },
      include: SOCKETED_ITEM_INCLUDE,
    });
    if (!ownedItem) throw new NotFoundException('Nie masz tego egzemplarza wyposażenia');

    const socket = ownedItem.sockets.find((entry) => entry.position === dto.position);
    if (!socket?.gemDefinition || !socket.gemDefinitionId) {
      throw new BadRequestException('Wybrane gniazdo nie zawiera klejnotu');
    }

    const extractedGem = socket.gemDefinition;
    const goldCost = calculateGemExtractionCost(extractedGem.tier);
    const balanceAfter = await this.prisma.$transaction(async (tx) => {
      const spentGold = await tx.character.updateMany({
        where: { id: character.id, gold: { gte: goldCost } },
        data: { gold: { decrement: goldCost } },
      });
      if (spentGold.count !== 1) throw new ConflictException('Masz za mało złota');

      const clearedSocket = await tx.itemSocket.updateMany({
        where: {
          ownedItemId: ownedItem.id,
          position: dto.position,
          gemDefinitionId: extractedGem.id,
        },
        data: { gemDefinitionId: null },
      });
      if (clearedSocket.count !== 1) {
        throw new ConflictException('Zawartość gniazda zmieniła się. Odśwież pracownię');
      }

      await tx.gemStack.upsert({
        where: {
          combatantId_gemDefinitionId: {
            combatantId: character.combatantId,
            gemDefinitionId: extractedGem.id,
          },
        },
        create: {
          combatantId: character.combatantId,
          gemDefinitionId: extractedGem.id,
          quantity: 1,
        },
        update: { quantity: { increment: 1 } },
      });
      const updatedCharacter = await tx.character.findUniqueOrThrow({
        where: { id: character.id },
        select: { gold: true },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'JEWELER_GEM_EXTRACT',
          amount: -goldCost,
          balanceAfter: updatedCharacter.gold,
          referenceId: ownedItem.id,
          description: `Odzyskanie ${extractedGem.name} z przedmiotu ${ownedItem.item.name}`,
        },
      });
      return updatedCharacter.gold;
    });

    const updatedItem = await this.prisma.ownedItem.findUniqueOrThrow({
      where: { id: ownedItem.id },
      include: SOCKETED_ITEM_INCLUDE,
    });
    return {
      success: true,
      extractedGem,
      goldCost: goldCost.toString(),
      balanceAfter: balanceAfter.toString(),
      item: {
        ...toOwnedItemResponse(updatedItem),
        equippedSlot: updatedItem.equippedEntry?.slot ?? null,
      },
    };
  }

  private buildRecipes(gemCatalog: GemDefinition[]) {
    return gemCatalog.flatMap((inputGem) => {
      const resultTier = nextGemTier(inputGem.tier);
      if (!resultTier) return [];
      const resultGem = gemCatalog.find(
        (candidate) => candidate.family === inputGem.family && candidate.tier === resultTier,
      );
      if (!resultGem) return [];
      return [{
        inputGem,
        resultGem,
        inputQuantity: GEM_COMBINE_RATIO,
        goldCost: calculateGemCombineCost(resultTier, 1).toString(),
      }];
    });
  }
}
