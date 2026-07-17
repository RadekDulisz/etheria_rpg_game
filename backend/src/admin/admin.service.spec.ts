import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let charactersService: { getById: jest.Mock };

  beforeEach(async () => {
    prisma = {
      item: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      bot: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      combatant: { create: jest.fn() },
      combatantStats: { create: jest.fn(), update: jest.fn() },
      character: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    charactersService = {
      getById: jest.fn().mockResolvedValue({ id: 'char-1', name: 'Player', gold: 1000n }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('tworzy przedmiot i waliduje bron', async () => {
    prisma.item.create.mockResolvedValueOnce({
      id: 'item-1',
      name: 'Sword',
      description: null,
      category: 'WEAPON',
      slotGroup: 'WEAPON',
      weaponType: 'SWORD',
      maxStack: 1,
      price: 10,
      iconUrl: null,
      minLevel: 1,
      strengthBonus: 0,
      agilityBonus: 0,
      enduranceBonus: 0,
      intelligenceBonus: 0,
      attackPower: 5,
      defensePower: 0,
      parryBonus: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createItem({
      name: 'Sword',
      category: 'WEAPON',
      slotGroup: 'WEAPON',
      weaponType: 'SWORD',
      price: 10,
      minLevel: 1,
    } as any);

    expect(result.name).toBe('Sword');
  });

  it('rzuca BadRequestException, gdy bron nie ma weaponType', async () => {
    await expect(
      service.createItem({
        name: 'Broken',
        category: 'WEAPON',
        slotGroup: 'WEAPON',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('tworzy bota z combatantem i statystykami', async () => {
    prisma.combatant.create.mockResolvedValueOnce({ id: 'combatant-1' });
    prisma.combatantStats.create.mockResolvedValueOnce({});
    prisma.bot.create.mockResolvedValueOnce({
      id: 'bot-1',
      combatantId: 'combatant-1',
      name: 'Goblin',
      level: 1,
      expReward: 20,
      goldReward: 10,
      isActive: true,
      combatant: {
        stats: { strength: 5, agility: 5, endurance: 5, intelligence: 5, parryRating: 0 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createBot({ name: 'Goblin' } as any);

    expect(prisma.combatant.create).toHaveBeenCalledWith({ data: { type: 'BOT' } });
    expect(result.name).toBe('Goblin');
  });

  it('rzuca NotFoundException przy korekcie nieistniejacej postaci', async () => {
    charactersService.getById.mockResolvedValueOnce(null);

    await expect(service.adjustCharacterBalance('missing', { amount: 10 } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('dopisuje korekte balansu do transakcji ADMIN_ADJUSTMENT', async () => {
    prisma.transaction.create.mockResolvedValueOnce({
      id: 'tx-1',
      createdAt: new Date(),
    });

    const result = await service.adjustCharacterBalance('char-1', {
      amount: 250,
      reason: 'Test balance',
    } as any);

    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { gold: 1250n },
    });
    expect(result.amount).toBe('250');
  });
});
