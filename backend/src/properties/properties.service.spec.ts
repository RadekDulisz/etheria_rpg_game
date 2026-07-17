import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuyPropertyDto } from './dto/buy-property.dto';
import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: any;
  let charactersService: { getByUserId: jest.Mock };

  const character = {
    id: 'char-1',
    combatantId: 'combatant-1',
    level: 5,
    experience: 0n,
    gold: 5000n,
    reputation: 0,
    currentHp: null,
    healthUpdatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    avatarUrl: null,
    property: { level: 1 },
    combatant: {
      id: 'combatant-1',
      stats: {
        combatantId: 'combatant-1',
        strength: 5,
        agility: 5,
        endurance: 5,
        intelligence: 5,
        unspentPoints: 0,
        parryRating: 0,
        updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
      },
      equippedItems: [],
      weaponExpertise: [],
    },
  };

  const property = {
    id: 'property-1',
    characterId: character.id,
    name: 'Villa',
    description: 'Opis',
    level: 1,
    baseIncome: 100,
    lastCollectedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    upgrades: [],
  };

  beforeEach(async () => {
    prisma = {
      property: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      propertyUpgrade: {
        create: jest.fn(),
      },
      character: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    charactersService = {
      getByUserId: jest.fn().mockResolvedValue(character),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  describe('buyProperty', () => {
    it('rzuca ConflictException, gdy postac ma juz posiadlosc', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(property);

      await expect(
        service.buyProperty('user-1', { name: 'Villa' } as BuyPropertyDto),
      ).rejects.toThrow(ConflictException);
    });

    it('rzuca ConflictException, gdy postac ma za malo zlota', async () => {
      charactersService.getByUserId.mockResolvedValueOnce({ ...character, gold: 100n });
      prisma.property.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.buyProperty('user-1', { name: 'Villa' } as BuyPropertyDto),
      ).rejects.toThrow(ConflictException);
    });

    it('kupuje posiadlosc i zapisuje transakcje', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);
      prisma.property.create.mockResolvedValueOnce(property);

      const result = await service.buyProperty('user-1', { name: 'Villa' } as BuyPropertyDto);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: character.id },
        data: { gold: 4850n },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PROPERTY_PURCHASE',
            amount: -150n,
            balanceAfter: 4850n,
          }),
        }),
      );
      expect(result.name).toBe('Villa');
    });
  });

  describe('upgradeMyProperty', () => {
    it('rzuca NotFoundException, gdy postac nie ma posiadlosci', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);

      await expect(service.upgradeMyProperty('user-1')).rejects.toThrow(NotFoundException);
    });

    it('rozbudowuje posiadlosc i zapisuje koszt ulepszenia', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(property);
      prisma.property.update.mockResolvedValueOnce({ ...property, level: 2, upgrades: [] });

      const result = await service.upgradeMyProperty('user-1');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: character.id },
        data: { gold: 4700n },
      });
      expect(prisma.propertyUpgrade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromLevel: 1,
            toLevel: 2,
            goldCost: 300,
          }),
        }),
      );
      expect(result.level).toBe(2);
    });
  });

  describe('collectIncome', () => {
    it('rzuca NotFoundException, gdy postac nie ma posiadlosci', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(null);

      await expect(service.collectIncome('user-1')).rejects.toThrow(NotFoundException);
    });

    it('rzuca BadRequestException, gdy nie minely pelne dni', async () => {
      prisma.property.findUnique.mockResolvedValueOnce(property);

      jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 0, 1, 12, 0, 0)));

      await expect(service.collectIncome('user-1')).rejects.toThrow(BadRequestException);

      jest.useRealTimers();
    });

    it('pobiera dochod i aktualizuje ostatni odbior', async () => {
      prisma.property.findUnique.mockResolvedValueOnce({
        ...property,
        lastCollectedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
      });
      prisma.property.update.mockResolvedValueOnce({
        ...property,
        lastCollectedAt: new Date(Date.UTC(2026, 0, 3, 0, 0, 0)),
        upgrades: [],
      });

      jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 0, 3, 12, 0, 0)));

      const result = await service.collectIncome('user-1');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: character.id },
        data: { gold: 5200n },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PROPERTY_INCOME',
            amount: 200n,
            balanceAfter: 5200n,
          }),
        }),
      );
      expect(result.collectableIncome).toBe(0);

      jest.useRealTimers();
    });
  });
});
