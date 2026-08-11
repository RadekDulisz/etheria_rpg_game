import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateSocketUnlockCost,
  calculateUpgradeChance,
  calculateUpgradeCost,
  enhancementCapForGrade,
  isSocketableItem,
  SOCKETABLE_SLOT_GROUPS,
  toOwnedItemResponse,
} from './blacksmith.balance';
import { InsertGemDto } from './dto/insert-gem.dto';

const OWNED_ITEM_INCLUDE = {
  item: true,
  equippedEntry: true,
  sockets: { include: { gemDefinition: true }, orderBy: { position: 'asc' as const } },
} as const;

@Injectable()
export class BlacksmithService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getWorkshop(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const [ownedItems, gemStacks, gemCatalog] = await Promise.all([
      this.prisma.ownedItem.findMany({
        where: {
          combatantId: character.combatantId,
          item: { slotGroup: { in: Array.from(SOCKETABLE_SLOT_GROUPS) } },
        },
        include: OWNED_ITEM_INCLUDE,
        orderBy: [{ enhancementLevel: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.gemStack.findMany({
        where: { combatantId: character.combatantId, quantity: { gt: 0 } },
        include: { gemDefinition: true },
        orderBy: { gemDefinition: { minLevel: 'asc' } },
      }),
      this.prisma.gemDefinition.findMany({ orderBy: [{ family: 'asc' }, { minLevel: 'asc' }] }),
    ]);

    return {
      gold: character.gold.toString(),
      characterLevel: character.level,
      items: ownedItems.map((ownedItem) => this.decorateOwnedItem(ownedItem)),
      gems: gemStacks,
      gemCatalog,
    };
  }

  async upgrade(userId: string, ownedItemId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const ownedItem = await this.findOwnedItem(character.combatantId, ownedItemId);
    if (!isSocketableItem(ownedItem.item)) {
      throw new BadRequestException('Kowal nie może ulepszyć tego rodzaju przedmiotu');
    }
    const enhancementLimit = enhancementCapForGrade(ownedItem.item.grade);
    if (ownedItem.enhancementLevel >= enhancementLimit) {
      throw new BadRequestException(`Ten przedmiot osiągnął limit +${enhancementLimit} dla swojej rangi`);
    }

    const nextLevel = ownedItem.enhancementLevel + 1;

    const goldCost = calculateUpgradeCost(ownedItem.item.price, nextLevel);
    if (character.gold < goldCost) throw new ConflictException('Masz za mało złota');

    const chance = calculateUpgradeChance(nextLevel, ownedItem.forgeFailStack);
    const success = Math.random() < chance;
    const balanceAfter = character.gold - goldCost;

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({ where: { id: character.id }, data: { gold: balanceAfter } });
      await tx.ownedItem.update({
        where: { id: ownedItem.id },
        data: success
          ? { enhancementLevel: nextLevel, forgeFailStack: 0 }
          : { forgeFailStack: { increment: 1 } },
      });
      const operation = await tx.forgeOperation.create({
        data: {
          characterId: character.id,
          ownedItemId,
          type: 'UPGRADE',
          result: success ? 'SUCCESS' : 'FAILURE',
          goldCost,
          fromLevel: ownedItem.enhancementLevel,
          toLevel: success ? nextLevel : ownedItem.enhancementLevel,
        },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'BLACKSMITH_UPGRADE',
          amount: -goldCost,
          balanceAfter,
          referenceId: operation.id,
          description: `Ulepszenie ${ownedItem.item.name}: ${success ? `+${nextLevel}` : 'nieudana próba'}`,
        },
      });
    });

    const updated = await this.findOwnedItem(character.combatantId, ownedItemId);
    return {
      success,
      chancePercent: Math.round(chance * 100),
      balanceAfter: balanceAfter.toString(),
      item: this.decorateOwnedItem(updated),
    };
  }

  async unlockSocket(userId: string, ownedItemId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const ownedItem = await this.findOwnedItem(character.combatantId, ownedItemId);
    if (!isSocketableItem(ownedItem.item) || ownedItem.socketCapacity < 1) {
      throw new BadRequestException('Ten przedmiot nie może posiadać gniazd');
    }
    if (ownedItem.unlockedSockets >= ownedItem.socketCapacity) {
      throw new BadRequestException('Wszystkie gniazda tego przedmiotu są już odblokowane');
    }

    const nextPosition = ownedItem.unlockedSockets;
    const goldCost = calculateSocketUnlockCost(ownedItem.item.price, nextPosition);
    if (character.gold < goldCost) throw new ConflictException('Masz za mało złota');
    const balanceAfter = character.gold - goldCost;

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({ where: { id: character.id }, data: { gold: balanceAfter } });
      await tx.ownedItem.update({
        where: { id: ownedItemId },
        data: { unlockedSockets: { increment: 1 } },
      });
      const operation = await tx.forgeOperation.create({
        data: {
          characterId: character.id,
          ownedItemId,
          type: 'SOCKET_UNLOCK',
          result: 'SUCCESS',
          goldCost,
        },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'BLACKSMITH_SOCKET_UNLOCK',
          amount: -goldCost,
          balanceAfter,
          referenceId: operation.id,
          description: `Odblokowanie gniazda: ${ownedItem.item.name}`,
        },
      });
    });

    const updated = await this.findOwnedItem(character.combatantId, ownedItemId);
    return {
      success: true,
      balanceAfter: balanceAfter.toString(),
      item: this.decorateOwnedItem(updated),
    };
  }

  async insertGem(userId: string, dto: InsertGemDto) {
    const character = await this.charactersService.getByUserId(userId);
    const ownedItem = await this.findOwnedItem(character.combatantId, dto.ownedItemId);
    if (dto.position >= ownedItem.unlockedSockets) {
      throw new BadRequestException('Wybrane gniazdo jest zamknięte');
    }
    if (!isSocketableItem(ownedItem.item)) {
      throw new BadRequestException('Ten przedmiot nie może przyjąć klejnotu');
    }

    const [gemStack, currentSocket] = await Promise.all([
      this.prisma.gemStack.findUnique({
        where: {
          combatantId_gemDefinitionId: {
            combatantId: character.combatantId,
            gemDefinitionId: dto.gemDefinitionId,
          },
        },
        include: { gemDefinition: true },
      }),
      this.prisma.itemSocket.findUnique({
        where: { ownedItemId_position: { ownedItemId: dto.ownedItemId, position: dto.position } },
      }),
    ]);
    if (!gemStack || gemStack.quantity < 1) throw new NotFoundException('Nie masz tego klejnotu');
    if (currentSocket?.gemDefinitionId === dto.gemDefinitionId) {
      throw new ConflictException('Ten klejnot jest już osadzony w wybranym gnieździe');
    }
    if (currentSocket?.gemDefinitionId && !dto.replaceExisting) {
      throw new ConflictException('Gniazdo jest zajęte. Potwierdź zniszczenie starego klejnotu');
    }
    if (
      character.level < gemStack.gemDefinition.minLevel
      || ownedItem.item.minLevel < gemStack.gemDefinition.minLevel
    ) {
      throw new BadRequestException(
        `Ten klejnot wymaga przedmiotu i bohatera na poziomie ${gemStack.gemDefinition.minLevel}`,
      );
    }

    const goldCost = BigInt(Math.max(1, Math.ceil(ownedItem.item.price * 0.1)));
    if (character.gold < goldCost) throw new ConflictException('Masz za mało złota');
    const balanceAfter = character.gold - goldCost;

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({ where: { id: character.id }, data: { gold: balanceAfter } });
      if (gemStack.quantity === 1) {
        await tx.gemStack.delete({
          where: {
            combatantId_gemDefinitionId: {
              combatantId: character.combatantId,
              gemDefinitionId: dto.gemDefinitionId,
            },
          },
        });
      } else {
        await tx.gemStack.update({
          where: {
            combatantId_gemDefinitionId: {
              combatantId: character.combatantId,
              gemDefinitionId: dto.gemDefinitionId,
            },
          },
          data: { quantity: { decrement: 1 } },
        });
      }
      await tx.itemSocket.upsert({
        where: { ownedItemId_position: { ownedItemId: dto.ownedItemId, position: dto.position } },
        create: {
          ownedItemId: dto.ownedItemId,
          position: dto.position,
          gemDefinitionId: dto.gemDefinitionId,
        },
        update: { gemDefinitionId: dto.gemDefinitionId },
      });
      const operation = await tx.forgeOperation.create({
        data: {
          characterId: character.id,
          ownedItemId: dto.ownedItemId,
          type: 'GEM_INSERT',
          result: 'SUCCESS',
          goldCost,
        },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'BLACKSMITH_GEM_INSERT',
          amount: -goldCost,
          balanceAfter,
          referenceId: operation.id,
          description: `Oprawienie klejnotu: ${ownedItem.item.name}`,
        },
      });
    });

    const updated = await this.findOwnedItem(character.combatantId, dto.ownedItemId);
    return {
      success: true,
      balanceAfter: balanceAfter.toString(),
      item: this.decorateOwnedItem(updated),
    };
  }

  private findOwnedItem(combatantId: string, ownedItemId: string) {
    return this.prisma.ownedItem.findFirstOrThrow({
      where: { id: ownedItemId, combatantId },
      include: OWNED_ITEM_INCLUDE,
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Nie masz tego egzemplarza wyposażenia');
      }
      throw error;
    });
  }

  private decorateOwnedItem(
    ownedItem: Awaited<ReturnType<BlacksmithService['findOwnedItem']>>,
  ) {
    const enhancementLimit = enhancementCapForGrade(ownedItem.item.grade);
    const nextLevel = ownedItem.enhancementLevel + 1;
    const upgrade = nextLevel <= enhancementLimit
      ? {
          nextLevel,
          goldCost: calculateUpgradeCost(ownedItem.item.price, nextLevel).toString(),
          successChancePercent: Math.round(
            calculateUpgradeChance(nextLevel, ownedItem.forgeFailStack) * 100,
          ),
        }
      : null;
    const nextSocket = ownedItem.unlockedSockets < ownedItem.socketCapacity
      ? {
          position: ownedItem.unlockedSockets,
          goldCost: calculateSocketUnlockCost(
            ownedItem.item.price,
            ownedItem.unlockedSockets,
          ).toString(),
        }
      : null;

    return {
      ...toOwnedItemResponse(ownedItem),
      equippedSlot: ownedItem.equippedEntry?.slot ?? null,
      enhancementLimit,
      upgrade,
      nextSocket,
    };
  }
}
