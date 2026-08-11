import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CharactersService } from './characters.service';

describe('CharactersService', () => {
  let service: CharactersService;
  let prisma: {
    character: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    combatant: { create: jest.Mock };
    combatantStats: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      character: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      combatant: { create: jest.fn() },
      combatantStats: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    // Domyslnie $transaction po prostu wykonuje przekazana funkcje,
    // podajac jako "tx" ten sam mockowany prisma - wystarczajace dla
    // testow jednostkowych bez zywej bazy danych.
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [CharactersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
  });

  const fullCharacter = {
    id: 'char-1',
    userId: 'user-1',
    combatantId: 'combatant-1',
    name: 'Test',
    level: 1,
    experience: 0n,
    gold: 0n,
    reputation: 0,
    avatarUrl: null,
    combatant: {
      id: 'combatant-1',
      type: 'PLAYER',
      stats: {
        combatantId: 'combatant-1',
        strength: 5,
        agility: 5,
        endurance: 5,
        intelligence: 5,
        unspentPoints: 0,
        parryRating: 0,
      },
    },
  };

  describe('createCharacter', () => {
    it('tworzy Combatant + Character + CombatantStats, gdy uzytkownik nie ma jeszcze postaci', async () => {
      prisma.character.findUnique
        .mockResolvedValueOnce(null) // sprawdzenie istniejacej postaci
        .mockResolvedValueOnce(fullCharacter); // odczyt po utworzeniu (getById)
      prisma.combatant.create.mockResolvedValueOnce({ id: 'combatant-1', type: 'PLAYER' });
      prisma.character.create.mockResolvedValueOnce({ id: 'char-1' });

      const result = await service.createCharacter('user-1', 'Test');

      expect(prisma.combatant.create).toHaveBeenCalledWith({ data: { type: 'PLAYER' } });
      expect(prisma.combatantStats.create).toHaveBeenCalledWith({
        data: { combatantId: 'combatant-1' },
      });
      expect(result.name).toBe('Test');
    });

    it('rzuca ConflictException, gdy uzytkownik ma juz postac', async () => {
      prisma.character.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.createCharacter('user-1', 'Test')).rejects.toThrow(ConflictException);
      expect(prisma.combatant.create).not.toHaveBeenCalled();
    });
  });

  describe('getByUserId', () => {
    it('rzuca NotFoundException, gdy postac nie istnieje', async () => {
      prisma.character.findUnique.mockResolvedValueOnce(null);

      await expect(service.getByUserId('user-1')).rejects.toThrow(NotFoundException);
    });

    it('zwraca postac wraz ze statystykami', async () => {
      prisma.character.findUnique.mockResolvedValueOnce(fullCharacter);

      const result = await service.getByUserId('user-1');

      expect(result.combatant.stats?.strength).toBe(5);
    });
  });

  describe('allocateStatPoints', () => {
    it('rzuca ConflictException, gdy suma przekracza dostepne punkty', async () => {
      prisma.character.findUnique.mockResolvedValueOnce({
        ...fullCharacter,
        combatant: {
          ...fullCharacter.combatant,
          stats: { ...fullCharacter.combatant.stats, unspentPoints: 2 },
        },
      });

      await expect(
        service.allocateStatPoints('user-1', {
          strength: 2,
          agility: 1,
          endurance: 0,
          intelligence: 0,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.combatantStats.updateMany).not.toHaveBeenCalled();
    });

    it('rozdziela punkty, gdy suma miesci sie w dostepnym limicie', async () => {
      prisma.character.findUnique
        .mockResolvedValueOnce({
          ...fullCharacter,
          combatant: {
            ...fullCharacter.combatant,
            stats: { ...fullCharacter.combatant.stats, unspentPoints: 5 },
          },
        })
        .mockResolvedValueOnce(fullCharacter);

      await service.allocateStatPoints('user-1', {
        strength: 3,
        agility: 0,
        endurance: 0,
        intelligence: 0,
      });

      expect(prisma.combatantStats.updateMany).toHaveBeenCalledWith({
        where: { combatantId: 'combatant-1', unspentPoints: { gte: 3 } },
        data: {
          strength: { increment: 3 },
          agility: { increment: 0 },
          endurance: { increment: 0 },
          intelligence: { increment: 0 },
          unspentPoints: { decrement: 3 },
        },
      });
    });

    it('nie pozwala wydać tego samego punktu w dwóch równoległych żądaniach', async () => {
      prisma.character.findUnique.mockResolvedValueOnce({
        ...fullCharacter,
        combatant: {
          ...fullCharacter.combatant,
          stats: { ...fullCharacter.combatant.stats, unspentPoints: 1 },
        },
      });
      prisma.combatantStats.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.allocateStatPoints('user-1', {
        strength: 1, agility: 0, endurance: 0, intelligence: 0,
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('addExperience', () => {
    it('awansuje poziom i dolicza punkty statystyk, gdy exp przekracza prog', async () => {
      prisma.character.findUnique
        .mockResolvedValueOnce(fullCharacter) // getById na wejsciu
        .mockResolvedValueOnce({ ...fullCharacter, level: 2, experience: 0n }); // getById po zapisie

      await service.addExperience('char-1', 100);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: {
          level: 2,
          experience: 0n,
          currentHp: 84,
          healthUpdatedAt: expect.any(Date),
        },
      });
      expect(prisma.combatantStats.update).toHaveBeenCalledWith({
        where: { combatantId: 'combatant-1' },
        data: { unspentPoints: { increment: 3 } },
      });
    });

    it('nie leczy postaci, jeżeli zdobyte EXP nie daje awansu', async () => {
      prisma.character.findUnique
        .mockResolvedValueOnce({ ...fullCharacter, currentHp: 23 })
        .mockResolvedValueOnce({ ...fullCharacter, experience: 40n, currentHp: 23 });

      await service.addExperience('char-1', 40);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1' },
        data: { level: 1, experience: 40n },
      });
    });
  });
});
