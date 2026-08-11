import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EquipmentSlot, SlotGroup } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    ownedItem: { findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
    equippedItem: { findUnique: jest.Mock; upsert: jest.Mock; delete: jest.Mock; findMany: jest.Mock };
    forgeOperation: { aggregate: jest.Mock };
    character: { update: jest.Mock };
    transaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let charactersService: { getByUserId: jest.Mock };

  const character = { id: 'char-1', combatantId: 'combatant-1', level: 1, gold: 100n };

  beforeEach(async () => {
    prisma = {
      ownedItem: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), delete: jest.fn() },
      equippedItem: {
        findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
      },
      forgeOperation: { aggregate: jest.fn().mockResolvedValue({ _sum: { goldCost: null } }) },
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
    service = module.get(InventoryService);
  });

  describe('equipItem', () => {
    it('odrzuca nieposiadany egzemplarz', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue(null);
      await expect(service.equipItem('user-1', 'owned-1', EquipmentSlot.RING_1)).rejects.toThrow(NotFoundException);
    });

    it('odrzuca niezgodny slot', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-1', item: { slotGroup: SlotGroup.HELM, minLevel: 1 }, equippedEntry: null });
      await expect(service.equipItem('user-1', 'owned-1', EquipmentSlot.RING_1)).rejects.toThrow(BadRequestException);
    });

    it('nie pozwala ponownie założyć tego samego egzemplarza', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-1', item: { slotGroup: SlotGroup.GLOVES, minLevel: 1 }, equippedEntry: { slot: EquipmentSlot.GLOVES } });
      await expect(service.equipItem('user-1', 'owned-1', EquipmentSlot.GLOVES)).rejects.toThrow(BadRequestException);
      expect(prisma.equippedItem.upsert).not.toHaveBeenCalled();
    });

    it('nie pozwala założyć przedmiotu ponad poziom bohatera', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-1', item: { slotGroup: SlotGroup.HELM, minLevel: 2 }, equippedEntry: null });
      await expect(service.equipItem('user-1', 'owned-1', EquipmentSlot.HELM)).rejects.toThrow(BadRequestException);
    });

    it('zakłada konkretny drugi egzemplarz pierścienia', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-ring-2', item: { slotGroup: SlotGroup.RING, minLevel: 1 }, equippedEntry: null });
      await service.equipItem('user-1', 'owned-ring-2', EquipmentSlot.RING_2);
      expect(prisma.equippedItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_slot: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_2 } },
        create: { combatantId: 'combatant-1', slot: EquipmentSlot.RING_2, ownedItemId: 'owned-ring-2' },
        update: { ownedItemId: 'owned-ring-2', equippedAt: expect.any(Date) },
      });
    });
  });

  describe('unequipSlot', () => {
    it('odrzuca pusty slot', async () => {
      prisma.equippedItem.findUnique.mockResolvedValue(null);
      await expect(service.unequipSlot('user-1', EquipmentSlot.HELM)).rejects.toThrow(NotFoundException);
    });

    it('zdejmuje wpis wyposażenia bez usuwania egzemplarza', async () => {
      prisma.equippedItem.findUnique.mockResolvedValue({ ownedItemId: 'owned-helm' });
      await service.unequipSlot('user-1', EquipmentSlot.HELM);
      expect(prisma.equippedItem.delete).toHaveBeenCalledWith({
        where: { combatantId_slot: { combatantId: 'combatant-1', slot: EquipmentSlot.HELM } },
      });
      expect(prisma.ownedItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('sellItem', () => {
    it('sprzedaje jeden konkretny egzemplarz i zapisuje transakcję', async () => {
      prisma.ownedItem.findFirst.mockResolvedValue({
        id: 'owned-1', item: { name: 'Miecz próbny', price: 101 }, sockets: [],
      });
      const result = await service.sellItem('user-1', 'owned-1', 1);
      expect(result.proceeds).toBe('30');
      expect(prisma.ownedItem.delete).toHaveBeenCalledWith({ where: { id: 'owned-1' } });
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' }, data: { gold: { increment: 30n } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'ITEM_SALE', amount: 30n, balanceAfter: 130n }),
      });
    });

    it('odrzuca sprzedaż wielu egzemplarzy naraz', async () => {
      await expect(service.sellItem('user-1', 'owned-1', 2)).rejects.toThrow(BadRequestException);
      expect(prisma.ownedItem.findFirst).not.toHaveBeenCalled();
    });
  });
});
