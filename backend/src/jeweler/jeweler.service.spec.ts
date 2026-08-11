import { GemFamily, GemTier, ItemGrade, ItemRarity, SlotGroup } from '@prisma/client';
import { JewelerService } from './jeweler.service';

describe('JewelerService', () => {
  const character = {
    id: 'character-id',
    combatantId: 'combatant-id',
    level: 40,
    gold: 10_000n,
  };
  const inputGem = {
    id: '11111111-1111-4111-8111-111111111111',
    family: GemFamily.RUBY,
    tier: GemTier.SHARD,
    name: 'Okrągły Rubin',
    minLevel: 1,
    iconUrl: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const resultGem = { ...inputGem, id: '22222222-2222-4222-8222-222222222222', tier: GemTier.CUT, name: 'Rubin Cushion' };

  function createPrismaMock() {
    const tx = {
      character: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ gold: 9_880n }),
      },
      gemStack: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      itemSocket: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      transaction: { create: jest.fn().mockResolvedValue({ id: 'transaction-id' }) },
    };
    const prisma = {
      gemDefinition: {
        findUnique: jest.fn().mockImplementation(({ where }) => (
          where.id === inputGem.id ? inputGem : resultGem
        )),
      },
      ownedItem: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    return { prisma, tx };
  }

  it('zużywa trzy kamienie i zapisuje jeden kamień następnego szlifu', async () => {
    const { prisma, tx } = createPrismaMock();
    const charactersService = { getByUserId: jest.fn().mockResolvedValue(character) };
    const service = new JewelerService(prisma as never, charactersService as never);

    const result = await service.combine('user-id', {
      gemDefinitionId: inputGem.id,
      count: 1,
    });

    expect(tx.gemStack.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ quantity: { gte: 3 } }),
      data: { quantity: { decrement: 3 } },
    }));
    expect(tx.gemStack.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ gemDefinitionId: resultGem.id, quantity: 1 }),
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      consumedQuantity: 3,
      createdQuantity: 1,
      goldCost: '120',
    }));
  });

  it('odzyskuje klejnot, czyści gniazdo i nie niszczy kamienia', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.character.findUniqueOrThrow.mockResolvedValue({ gold: 9_940n });
    const item = {
      id: '33333333-3333-4333-8333-333333333333',
      combatantId: character.combatantId,
      itemId: 'item-id',
      enhancementLevel: 0,
      socketCapacity: 1,
      unlockedSockets: 1,
      forgeFailStack: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      equippedEntry: null,
      item: {
        id: 'item-id', name: 'Miecz', description: null, category: 'WEAPON',
        rarity: ItemRarity.COMMON, grade: ItemGrade.NO_GRADE,
        slotGroup: SlotGroup.WEAPON, weaponType: 'SWORD', maxStack: 1,
        price: 100, iconUrl: null, minLevel: 1, strengthBonus: 0,
        agilityBonus: 0, enduranceBonus: 0, intelligenceBonus: 0,
        attackPower: 5, damageMin: 4, damageMax: 6, defensePower: 0,
        parryBonus: 0, maxHpBonus: 0, criticalChanceBonus: 0,
        createdAt: new Date(0), updatedAt: new Date(0),
      },
      sockets: [{
        ownedItemId: '33333333-3333-4333-8333-333333333333', position: 0,
        gemDefinitionId: inputGem.id, gemDefinition: inputGem,
        createdAt: new Date(0), updatedAt: new Date(0),
      }],
    };
    prisma.ownedItem.findFirst.mockResolvedValue(item);
    prisma.ownedItem.findUniqueOrThrow.mockResolvedValue({ ...item, sockets: [] });
    const charactersService = { getByUserId: jest.fn().mockResolvedValue(character) };
    const service = new JewelerService(prisma as never, charactersService as never);

    const result = await service.extract('user-id', { ownedItemId: item.id, position: 0 });

    expect(tx.itemSocket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { gemDefinitionId: null },
    }));
    expect(tx.gemStack.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { quantity: { increment: 1 } },
    }));
    expect(result).toEqual(expect.objectContaining({ success: true, goldCost: '60' }));
  });
});
