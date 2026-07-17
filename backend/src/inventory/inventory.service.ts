import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentSlot } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { isSlotCompatible } from './slot-mapping';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getInventory(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    return this.prisma.inventoryItem.findMany({
      where: { combatantId: character.combatantId },
      include: { item: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEquipment(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    return this.prisma.equippedItem.findMany({
      where: { combatantId: character.combatantId },
      include: { item: true },
    });
  }

  async sellItem(userId: string, itemId: string, quantity: number) {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.inventoryItem.findUnique({
        where: { combatantId_itemId: { combatantId, itemId } },
        include: { item: true },
      });
      if (!entry || entry.quantity < quantity) {
        throw new BadRequestException('Nie masz tylu sztuk tego przedmiotu w plecaku');
      }

      const unitPrice = Math.max(1, Math.floor(entry.item.price * 0.3));
      const proceeds = BigInt(unitPrice * quantity);
      const balanceAfter = character.gold + proceeds;

      if (entry.quantity === quantity) {
        await tx.inventoryItem.delete({ where: { id: entry.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: entry.id },
          data: { quantity: { decrement: quantity } },
        });
      }
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
          referenceId: itemId,
          description: `Sprzedaż: ${entry.item.name} ×${quantity}`,
        },
      });

      return { itemId, quantity, unitPrice, proceeds: proceeds.toString(), balanceAfter: balanceAfter.toString() };
    });
  }

  /**
   * Zaklada przedmiot z plecaka we wskazanym, konkretnym slocie. Jesli
   * slot jest juz zajety, dotychczasowy przedmiot wraca do plecaka -
   * wszystko w jednej transakcji, zeby nie doszlo do stanu, w ktorym
   * przedmiot "zniknal" miedzy dwoma krokami.
   */
  async equipItem(userId: string, itemId: string, slot: EquipmentSlot) {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;

    const inventoryEntry = await this.prisma.inventoryItem.findUnique({
      where: { combatantId_itemId: { combatantId, itemId } },
      include: { item: true },
    });
    if (!inventoryEntry || inventoryEntry.quantity < 1) {
      throw new NotFoundException('Nie masz tego przedmiotu w plecaku');
    }

    const { item } = inventoryEntry;
    if (!item.slotGroup || !isSlotCompatible(item.slotGroup, slot)) {
      throw new BadRequestException('Tego przedmiotu nie można założyć w wybranym miejscu');
    }
    if (character.level < item.minLevel) {
      throw new BadRequestException(`Ten przedmiot wymaga poziomu ${item.minLevel}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const currentlyEquipped = await tx.equippedItem.findUnique({
        where: { combatantId_slot: { combatantId, slot } },
      });

      // Ponowne zalozenie tego samego typu przedmiotu do tego samego slotu
      // nie jest zamiana. Bez tego warunku stary egzemplarz byl najpierw
      // dodawany do stosu, a potem caly stos mogl zostac usuniety na podstawie
      // ilosci odczytanej przed transakcja.
      if (currentlyEquipped?.itemId === itemId) {
        throw new BadRequestException('Ten przedmiot jest już założony w wybranym miejscu');
      }

      if (currentlyEquipped) {
        await tx.inventoryItem.upsert({
          where: {
            combatantId_itemId: { combatantId, itemId: currentlyEquipped.itemId },
          },
          create: { combatantId, itemId: currentlyEquipped.itemId, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }

      if (inventoryEntry.quantity === 1) {
        await tx.inventoryItem.delete({
          where: { combatantId_itemId: { combatantId, itemId } },
        });
      } else {
        await tx.inventoryItem.update({
          where: { combatantId_itemId: { combatantId, itemId } },
          data: { quantity: { decrement: 1 } },
        });
      }

      await tx.equippedItem.upsert({
        where: { combatantId_slot: { combatantId, slot } },
        create: { combatantId, slot, itemId },
        update: { itemId },
      });
    });

    return this.getEquipment(userId);
  }

  async unequipSlot(userId: string, slot: EquipmentSlot) {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;

    const equipped = await this.prisma.equippedItem.findUnique({
      where: { combatantId_slot: { combatantId, slot } },
    });
    if (!equipped) {
      throw new NotFoundException('To miejsce wyposażenia jest puste');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.equippedItem.delete({ where: { combatantId_slot: { combatantId, slot } } });
      await tx.inventoryItem.upsert({
        where: { combatantId_itemId: { combatantId, itemId: equipped.itemId } },
        create: { combatantId, itemId: equipped.itemId, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
    });

    return this.getEquipment(userId);
  }
}
