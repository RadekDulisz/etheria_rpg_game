import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EquipmentSlot, SlotGroup } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    inventoryItem: {
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      upsert: jest.Mock;
    };
    equippedItem: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
    character: { update: jest.Mock };
    transaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let charactersService: { getByUserId: jest.Mock };

  const character = { id: 'char-1', combatantId: 'combatant-1', level: 1 };

  beforeEach(async () => {
    prisma = {
      inventoryItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      },
      equippedItem: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      character: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    charactersService = { getByUserId: jest.fn().mockResolvedValue(character) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('equipItem', () => {
    it('rzuca NotFoundException, gdy przedmiotu nie ma w plecaku', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.equipItem('user-1', 'item-1', EquipmentSlot.RING_1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rzuca BadRequestException, gdy przedmiot nie pasuje do slotu', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        quantity: 1,
        item: { slotGroup: SlotGroup.HELM },
      });

      await expect(service.equipItem('user-1', 'item-1', EquipmentSlot.RING_1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nie usuwa stosu, gdy ten sam przedmiot jest juz zalozony w docelowym slocie', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        quantity: 1,
        item: { slotGroup: SlotGroup.GLOVES, minLevel: 1 },
      });
      prisma.equippedItem.findUnique.mockResolvedValueOnce({ itemId: 'gloves-1' });

      await expect(
        service.equipItem('user-1', 'gloves-1', EquipmentSlot.GLOVES),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.inventoryItem.upsert).not.toHaveBeenCalled();
      expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(prisma.equippedItem.upsert).not.toHaveBeenCalled();
    });

    it('nie pozwala zalozyc przedmiotu powyzej poziomu postaci', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        quantity: 1,
        item: { slotGroup: SlotGroup.HELM, minLevel: 2 },
      });

      await expect(
        service.equipItem('user-1', 'helm-2', EquipmentSlot.HELM),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('pozwala zalozyc drugi egzemplarz pierscienia do drugiego slotu', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        quantity: 1,
        item: { slotGroup: SlotGroup.RING, minLevel: 1 },
      });
      prisma.equippedItem.findUnique.mockResolvedValueOnce(null);
      prisma.equippedItem.findMany.mockResolvedValueOnce([]);

      await service.equipItem('user-1', 'ring-1', EquipmentSlot.RING_2);

      expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'ring-1' } },
      });
      expect(prisma.equippedItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_slot: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_2 } },
        create: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_2, itemId: 'ring-1' },
        update: { itemId: 'ring-1' },
      });
    });

    it('zamienia zalozony przedmiot i odklada stary do plecaka', async () => {
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        quantity: 1,
        item: { slotGroup: SlotGroup.RING },
      });
      prisma.equippedItem.findUnique.mockResolvedValueOnce({ itemId: 'old-ring' });
      prisma.equippedItem.findMany.mockResolvedValueOnce([]);

      await service.equipItem('user-1', 'new-ring', EquipmentSlot.RING_1);

      expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'old-ring' } },
        create: { combatantId: 'combatant-1', itemId: 'old-ring', quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'new-ring' } },
      });
      expect(prisma.equippedItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_slot: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_1 } },
        create: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_1, itemId: 'new-ring' },
        update: { itemId: 'new-ring' },
      });
    });
  });

  describe('unequipSlot', () => {
    it('rzuca NotFoundException, gdy slot jest pusty', async () => {
      prisma.equippedItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.unequipSlot('user-1', EquipmentSlot.HELM)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('zdejmuje przedmiot i zwraca go do plecaka', async () => {
      prisma.equippedItem.findUnique.mockResolvedValueOnce({ itemId: 'helm-1' });
      prisma.equippedItem.findMany.mockResolvedValueOnce([]);

      await service.unequipSlot('user-1', EquipmentSlot.HELM);

      expect(prisma.equippedItem.delete).toHaveBeenCalledWith({
        where: { combatantId_slot: { combatantId: 'combatant-1', slot: EquipmentSlot.HELM } },
      });
      expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'helm-1' } },
        create: { combatantId: 'combatant-1', itemId: 'helm-1', quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
    });
  });

  describe('sellItem', () => {
    it('sprzedaje przedmiot za 30% ceny bazowej i zapisuje transakcję', async () => {
      charactersService.getByUserId.mockResolvedValueOnce({ ...character, gold: 100n });
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        id: 'entry-1', quantity: 2, item: { name: 'Miecz próbny', price: 101 },
      });

      const result = await service.sellItem('user-1', 'item-1', 1);

      expect(result.proceeds).toBe('30');
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' }, data: { quantity: { decrement: 1 } },
      });
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' }, data: { gold: { increment: 30n } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'ITEM_SALE', amount: 30n, balanceAfter: 130n }),
      });
    });

    it('odrzuca sprzedaż większej liczby sztuk niż znajduje się w plecaku', async () => {
      charactersService.getByUserId.mockResolvedValueOnce({ ...character, gold: 0n });
      prisma.inventoryItem.findUnique.mockResolvedValueOnce({
        id: 'entry-1', quantity: 1, item: { name: 'Miecz próbny', price: 100 },
      });

      await expect(service.sellItem('user-1', 'item-1', 2)).rejects.toThrow(BadRequestException);
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });
});
