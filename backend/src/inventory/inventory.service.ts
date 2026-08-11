import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentSlot } from '@prisma/client';
import {
  OwnedItemWithDetails,
  resolveOwnedItemStats,
  toOwnedItemResponse,
} from '../blacksmith/blacksmith.balance';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { isSlotCompatible } from './slot-mapping';

const OWNED_ITEM_INCLUDE = {
  item: true,
  sockets: { include: { gemDefinition: true }, orderBy: { position: 'asc' as const } },
} as const;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getInventory(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const items = await this.prisma.ownedItem.findMany({
      where: { combatantId: character.combatantId, equippedEntry: null },
      include: OWNED_ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return items.map((item) => toOwnedItemResponse(item));
  }

  async getGems(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    return this.prisma.gemStack.findMany({
      where: { combatantId: character.combatantId, quantity: { gt: 0 } },
      include: { gemDefinition: true },
      orderBy: [
        { gemDefinition: { minLevel: 'desc' } },
        { gemDefinition: { family: 'asc' } },
      ],
    });
  }

  async getEquipment(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const equipment = await this.prisma.equippedItem.findMany({
      where: { combatantId: character.combatantId },
      include: { ownedItem: { include: OWNED_ITEM_INCLUDE } },
    });
    return equipment.map((entry) => this.toEquipmentResponse(entry));
  }

  async sellItem(userId: string, ownedItemId: string, quantity: number) {
    if (quantity !== 1) {
      throw new BadRequestException('Wyposażenie jest sprzedawane po jednym egzemplarzu');
    }
    const character = await this.charactersService.getByUserId(userId);
    const ownedItem = await this.prisma.ownedItem.findFirst({
      where: {
        id: ownedItemId,
        combatantId: character.combatantId,
        equippedEntry: null,
      },
      include: OWNED_ITEM_INCLUDE,
    });
    if (!ownedItem) throw new NotFoundException('Nie masz tego egzemplarza w plecaku');
    if (ownedItem.item.price <= 0) {
      throw new BadRequestException('Pamiątek fabularnych nie można sprzedać');
    }

    return this.prisma.$transaction(async (tx) => {
      const forgeCosts = await tx.forgeOperation.aggregate({
        where: { ownedItemId },
        _sum: { goldCost: true },
      });
      const baseValue = BigInt(Math.max(1, Math.floor(ownedItem.item.price * 0.3)));
      const forgeRecovery = (forgeCosts._sum.goldCost ?? 0n) / 5n;
      const proceeds = baseValue + forgeRecovery;
      const balanceAfter = character.gold + proceeds;

      await tx.ownedItem.delete({ where: { id: ownedItemId } });
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { increment: proceeds } },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'ITEM_SALE',
          amount: proceeds,
          balanceAfter,
          referenceId: ownedItemId,
          description: `Sprzedaż: ${ownedItem.item.name}`,
        },
      });

      return {
        ownedItemId,
        quantity: 1,
        proceeds: proceeds.toString(),
        balanceAfter: balanceAfter.toString(),
      };
    });
  }

  async equipItem(userId: string, ownedItemId: string, slot: EquipmentSlot) {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;
    const ownedItem = await this.prisma.ownedItem.findFirst({
      where: { id: ownedItemId, combatantId },
      include: { item: true, equippedEntry: true },
    });
    if (!ownedItem) throw new NotFoundException('Nie masz tego egzemplarza');
    if (ownedItem.equippedEntry) {
      throw new BadRequestException('Ten egzemplarz jest już założony');
    }
    if (!ownedItem.item.slotGroup || !isSlotCompatible(ownedItem.item.slotGroup, slot)) {
      throw new BadRequestException('Tego przedmiotu nie można założyć w wybranym miejscu');
    }
    if (character.level < ownedItem.item.minLevel) {
      throw new BadRequestException(`Ten przedmiot wymaga poziomu ${ownedItem.item.minLevel}`);
    }

    await this.prisma.equippedItem.upsert({
      where: { combatantId_slot: { combatantId, slot } },
      create: { combatantId, slot, ownedItemId },
      update: { ownedItemId, equippedAt: new Date() },
    });
    return this.getEquipment(userId);
  }

  async unequipSlot(userId: string, slot: EquipmentSlot) {
    const character = await this.charactersService.getByUserId(userId);
    const equipped = await this.prisma.equippedItem.findUnique({
      where: { combatantId_slot: { combatantId: character.combatantId, slot } },
    });
    if (!equipped) throw new NotFoundException('To miejsce wyposażenia jest puste');

    await this.prisma.equippedItem.delete({
      where: { combatantId_slot: { combatantId: character.combatantId, slot } },
    });
    return this.getEquipment(userId);
  }

  private toEquipmentResponse(entry: {
    combatantId: string;
    slot: EquipmentSlot;
    ownedItemId: string;
    equippedAt: Date;
    ownedItem: OwnedItemWithDetails;
  }) {
    return {
      combatantId: entry.combatantId,
      slot: entry.slot,
      ownedItemId: entry.ownedItemId,
      itemId: entry.ownedItem.itemId,
      equippedAt: entry.equippedAt,
      enhancementLevel: entry.ownedItem.enhancementLevel,
      socketCapacity: entry.ownedItem.socketCapacity,
      unlockedSockets: entry.ownedItem.unlockedSockets,
      sockets: entry.ownedItem.sockets,
      baseItem: entry.ownedItem.item,
      item: resolveOwnedItemStats(entry.ownedItem),
    };
  }
}
