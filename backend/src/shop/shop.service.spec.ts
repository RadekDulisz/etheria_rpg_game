import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { ItemGrade } from '@prisma/client';
import { CatalogSection } from './dto/catalog-query.dto';
import { rollDailyDiscount, ShopService, visibleMarketGrades } from './shop.service';

describe('ShopService', () => {
  let service: ShopService;
  let prisma: {
    shopEntry: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
    };
    item: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
    character: { update: jest.Mock };
    inventoryItem: { upsert: jest.Mock };
    transaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let charactersService: { getByUserId: jest.Mock };

  const character = { id: 'char-1', combatantId: 'combatant-1', level: 3, gold: 1000n };

  beforeEach(async () => {
    prisma = {
      shopEntry: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      item: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      character: { update: jest.fn() },
      inventoryItem: { upsert: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    charactersService = { getByUserId: jest.fn().mockResolvedValue(character) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  describe('ensureTodayOffers', () => {
    it('nic nie robi, gdy oferta na dzis juz istnieje', async () => {
      prisma.shopEntry.count.mockResolvedValueOnce(5);

      await service.ensureTodayOffers();

      expect(prisma.item.findMany).not.toHaveBeenCalled();
      expect(prisma.shopEntry.createMany).not.toHaveBeenCalled();
    });

    it('losuje przedmioty i tworzy oferty, gdy na dzis jeszcze ich nie ma', async () => {
      prisma.shopEntry.count.mockResolvedValueOnce(0);
      prisma.item.findMany.mockResolvedValueOnce([
        { id: 'item-1', price: 100, rarity: 'COMMON', grade: ItemGrade.NO_GRADE },
        { id: 'item-2', price: 200, rarity: 'UNCOMMON', grade: ItemGrade.NO_GRADE },
        { id: 'item-3', price: 300, rarity: 'RARE', grade: ItemGrade.NO_GRADE },
      ]);

      await service.ensureTodayOffers();

      expect(prisma.shopEntry.createMany).toHaveBeenCalledTimes(1);
      const call = prisma.shopEntry.createMany.mock.calls[0][0];
      expect(call.data).toHaveLength(3);
      expect(call.data.every((entry: { priceOverride: number }) => entry.priceOverride > 0)).toBe(true);
    });
  });

  describe('widoczne rangi targowiska', () => {
    it.each([
      [1, [ItemGrade.NO_GRADE, ItemGrade.D]],
      [40, [ItemGrade.C, ItemGrade.B]],
      [80, [ItemGrade.RUNIC, ItemGrade.ANCIENT]],
      [84, [ItemGrade.ANCIENT]],
    ])('dla poziomu %i zwraca tylko aktualna i nastepna range', (level, expected) => {
      expect(visibleMarketGrades(level)).toEqual(expected);
    });
  });

  describe('catalog', () => {
    it('zwraca wszystkie przedmioty i blokuje te powyzej poziomu postaci', async () => {
      prisma.item.findMany.mockResolvedValueOnce([
        { id: 'item-1', minLevel: 1 },
        { id: 'item-2', minLevel: 10 },
      ]);

      prisma.item.count.mockResolvedValueOnce(2);
      const result = await service.getCatalog('user-1', {
        section: CatalogSection.WEAPONS,
        grade: ItemGrade.NO_GRADE,
        page: 1,
        pageSize: 12,
      });

      expect(result.items).toEqual([
        expect.objectContaining({ id: 'item-1', locked: false }),
        expect.objectContaining({ id: 'item-2', locked: true }),
      ]);
      expect(result).toEqual(expect.objectContaining({ page: 1, total: 2, totalPages: 1 }));
    });

    it('finalizuje zakup z katalogu po pelnej cenie', async () => {
      prisma.item.findUnique.mockResolvedValueOnce({
        id: 'item-1',
        name: 'Miecz kupca',
        price: 120,
        minLevel: 1,
      });

      await service.purchaseCatalogItem('user-1', 'item-1', 2);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: { gold: 760n },
      });
      expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'item-1' } },
        create: { combatantId: 'combatant-1', itemId: 'item-1', quantity: 2 },
        update: { quantity: { increment: 2 } },
      });
    });
  });

  describe('rollDailyDiscount', () => {
    it.each([
      [0.00, 0.00, 5],
      [0.899, 0.999, 15],
      [0.90, 0.00, 16],
      [0.989, 0.999, 25],
      [0.99, 0.00, 25],
      [0.999, 0.999, 30],
    ])('losuje poprawny prog dla rzutu %p', (bucketRoll, rangeRoll, expected) => {
      const rng = jest.fn().mockReturnValueOnce(bucketRoll).mockReturnValueOnce(rangeRoll);
      expect(rollDailyDiscount(rng)).toBe(expected);
    });
  });

  describe('purchase', () => {
    const baseEntry = {
      id: 'entry-1',
      itemId: 'item-1',
      offerDate: new Date(Date.UTC(2026, 0, 1)),
      priceOverride: null,
      stockLimit: null,
      quantitySold: 0,
      item: { id: 'item-1', name: 'Miecz', price: 100, minLevel: 1 },
    };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 0, 1, 12, 0, 0)));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rzuca NotFoundException, gdy oferta nie istnieje', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce(null);

      await expect(service.purchase('user-1', 'brak-oferty', 1)).rejects.toThrow(NotFoundException);
    });

    it('rzuca BadRequestException, gdy oferta jest z innego dnia', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce({
        ...baseEntry,
        offerDate: new Date(Date.UTC(2025, 11, 31)),
      });

      await expect(service.purchase('user-1', 'entry-1', 1)).rejects.toThrow(BadRequestException);
    });

    it('rzuca BadRequestException, gdy poziom postaci jest za niski', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce({
        ...baseEntry,
        item: { ...baseEntry.item, minLevel: 10 },
      });

      await expect(service.purchase('user-1', 'entry-1', 1)).rejects.toThrow(BadRequestException);
    });

    it('rzuca ConflictException, gdy przekroczony limit sztuk', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce({
        ...baseEntry,
        stockLimit: 2,
        quantitySold: 2,
      });

      await expect(service.purchase('user-1', 'entry-1', 1)).rejects.toThrow(ConflictException);
    });

    it('rzuca ConflictException, gdy postac ma za malo zlota', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce({
        ...baseEntry,
        item: { ...baseEntry.item, price: 10_000 },
      });

      await expect(service.purchase('user-1', 'entry-1', 1)).rejects.toThrow(ConflictException);
    });

    it('finalizuje zakup: odejmuje zloto, dolicza plecak, zapisuje Transaction', async () => {
      prisma.shopEntry.findUnique.mockResolvedValueOnce(baseEntry);

      await service.purchase('user-1', 'entry-1', 2);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: { gold: 800n }, // 1000 - 100*2
      });
      expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith({
        where: { combatantId_itemId: { combatantId: 'combatant-1', itemId: 'item-1' } },
        create: { combatantId: 'combatant-1', itemId: 'item-1', quantity: 2 },
        update: { quantity: { increment: 2 } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          characterId: 'char-1',
          type: 'SHOP_PURCHASE',
          amount: -200n,
          balanceAfter: 800n,
          referenceId: 'entry-1',
        }),
      });
    });
  });
});
