import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BattlesService } from './battles.service';

// rng ktory zawsze trafia, nigdy nie paruje ani nie krytykuje - deterministyczny
// wynik walki zalezny wylacznie od statow/attackPower podanych w tescie.
const ALWAYS_HIT_NO_CRIT_RNG = () => 0.3;
const ALWAYS_MISS_RNG = () => 0.999;

describe('BattlesService', () => {
  let service: BattlesService;
  let prisma: {
    bot: { findUnique: jest.Mock; findMany: jest.Mock };
    equippedItem: { findMany: jest.Mock };
    ownedItem: { findMany: jest.Mock; create: jest.Mock };
    combatantWeaponExpertise: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    battle: { create: jest.Mock; findUnique: jest.Mock };
    character: { update: jest.Mock };
    transaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let charactersService: { getByUserId: jest.Mock; getById: jest.Mock; addExperience: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock };

  const stats = {
    strength: 5,
    agility: 5,
    endurance: 5,
    intelligence: 5,
    unspentPoints: 0,
    parryRating: 0,
  };

  const weakCharacter = {
    id: 'char-weak',
    name: 'Slabeusz',
    combatantId: 'combatant-weak',
    level: 1,
    gold: 100n,
    reputation: 0,
    combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
  };

  const strongAttacker = {
    id: 'char-strong',
    name: 'Mocarz',
    combatantId: 'combatant-strong',
    level: 20,
    gold: 100n,
    reputation: 0,
    combatant: { stats: { ...stats, strength: 50 }, equippedItems: [] },
  };

  const underdogAttacker = {
    id: 'char-underdog',
    name: 'Underdog',
    combatantId: 'combatant-underdog',
    level: 1,
    gold: 100n,
    reputation: 0,
    combatant: { stats: { ...stats, strength: 50 }, equippedItems: [] },
  };

  const strongerDefender = {
    id: 'char-stronger',
    name: 'Silniejszy',
    combatantId: 'combatant-stronger',
    level: 10,
    gold: 100n,
    reputation: 0,
    combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
  };

  const balancedDefender = {
    id: 'char-balanced',
    name: 'Rowny',
    combatantId: 'combatant-balanced',
    level: 20,
    gold: 100n,
    reputation: 0,
    combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
  };

  beforeEach(async () => {
    prisma = {
      bot: { findUnique: jest.fn(), findMany: jest.fn() },
      equippedItem: { findMany: jest.fn().mockResolvedValue([]) },
      ownedItem: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      combatantWeaponExpertise: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      battle: { create: jest.fn(), findUnique: jest.fn() },
      character: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.battle.create.mockResolvedValue({ id: 'battle-1', rounds: [] });

    charactersService = {
      getByUserId: jest.fn(),
      getById: jest.fn(),
      addExperience: jest.fn(),
    };

    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<BattlesService>(BattlesService);
  });

  describe('cooldown', () => {
    it('rzuca ConflictException, gdy cooldown ataku jest aktywny', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(weakCharacter);
      redis.get.mockResolvedValueOnce('1');

      await expect(service.fightBot('user-1', 'bot-1')).rejects.toThrow(ConflictException);
      expect(prisma.bot.findUnique).not.toHaveBeenCalled();
    });

    it('ustawia cooldown po udanym ataku', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(weakCharacter);
      prisma.bot.findUnique.mockResolvedValueOnce({
        id: 'bot-1',
        combatantId: 'combatant-bot',
        name: 'Test Bot',
        level: 1,
        isActive: true,
        expReward: 10,
        goldReward: 5,
        combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
      });

      await service.fightBot('user-1', 'bot-1', ALWAYS_MISS_RNG);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('attack-cooldown:'),
        '1',
        'EX',
        3,
      );
    });

    it('arena zużywa HP i zapisuje bilans oraz ranking', async () => {
      charactersService.getByUserId.mockResolvedValueOnce({
        ...weakCharacter,
        arenaRating: 1000,
        arenaWins: 0,
        arenaLosses: 0,
        arenaDraws: 0,
        currentHp: null,
        healthUpdatedAt: new Date(),
        property: null,
        combatant: { ...weakCharacter.combatant, weaponExpertise: [] },
      });
      prisma.bot.findUnique.mockResolvedValueOnce({
        id: 'arena-bot-1',
        combatantId: 'combatant-arena-bot',
        name: 'Aldren — Ostrze Areny',
        level: 1,
        isActive: true,
        expReward: 10,
        goldReward: 5,
        combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
      });

      const result = await service.fightBot(
        'user-1',
        'arena-bot-1',
        ALWAYS_MISS_RNG,
        true,
      );

      expect(prisma.character.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: weakCharacter.id },
        data: expect.objectContaining({
          currentHp: expect.any(Number),
          arenaRating: expect.any(Number),
          arenaDraws: { increment: 1 },
        }),
      }));
      expect(result.arenaProfile).toEqual(expect.objectContaining({
        draws: 1,
        hpCost: expect.any(Number),
      }));
    });

    it('zwraca rzeczywisty przyrost i awans bieglosci aktywnej broni', async () => {
      const swordExpertise = {
        combatantId: weakCharacter.combatantId,
        weaponType: 'SWORD',
        experience: 70,
        level: 1,
      };
      charactersService.getByUserId.mockResolvedValueOnce({
        ...weakCharacter,
        combatant: {
          ...weakCharacter.combatant,
          weaponExpertise: [swordExpertise],
        },
      });
      prisma.bot.findUnique.mockResolvedValueOnce({
        id: 'bot-1',
        combatantId: 'combatant-bot',
        name: 'Test Bot',
        level: 1,
        isActive: true,
        expReward: 10,
        goldReward: 5,
        combatant: { stats: { ...stats, strength: 0 }, equippedItems: [] },
      });
      prisma.equippedItem.findMany
        .mockResolvedValueOnce([{
          combatantId: weakCharacter.combatantId,
          itemId: 'sword-1',
          slot: 'WEAPON',
          item: {
            strengthBonus: 0,
            agilityBonus: 0,
            enduranceBonus: 0,
            intelligenceBonus: 0,
            attackPower: 140,
            damageMin: 140,
            damageMax: 140,
            defensePower: 0,
            parryBonus: 0,
            maxHpBonus: 0,
            criticalChanceBonus: 0,
            weaponType: 'SWORD',
          },
        }])
        .mockResolvedValueOnce([]);
      prisma.combatantWeaponExpertise.findMany
        .mockResolvedValueOnce([swordExpertise])
        .mockResolvedValueOnce([]);

      const result = await service.fightBot('user-1', 'bot-1', ALWAYS_HIT_NO_CRIT_RNG);

      expect(result.expertiseReward).toEqual({
        weaponType: 'SWORD',
        experienceGained: 5,
        experienceAfter: 75,
        levelBefore: 1,
        levelAfter: 2,
        leveledUp: true,
      });
    });
  });

  describe('arena matchmaking', () => {
    it('zwraca aktywnego rywala o zbliżonym poziomie i sile', async () => {
      const arenaCharacter = {
        ...weakCharacter,
        combatant: { ...weakCharacter.combatant, weaponExpertise: [] },
      };
      charactersService.getByUserId.mockResolvedValueOnce(arenaCharacter);
      redis.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('previous-arena-bot');
      prisma.bot.findMany.mockResolvedValueOnce(Array.from({ length: 4 }, (_, index) => ({
        id: index === 0 ? 'arena-bot' : `arena-bot-${index}`,
        combatantId: index === 0 ? 'combatant-arena-bot' : `combatant-arena-bot-${index}`,
        name: index === 0 ? 'Aldren — Żelazna Pięść' : `Rywal ${index} — Ostrze Areny`,
        level: 1,
        isActive: true,
        expReward: 9,
        goldReward: 11,
        reputation: index % 2 === 0 ? -150 : -75,
        combatant: {
          stats: { ...stats, strength: 0 },
          equippedItems: [],
          weaponExpertise: [],
        },
      })));

      const opponent = await service.getArenaOpponent('user-1', () => 0, 'currently-visible-bot');

      expect(opponent).toEqual(expect.objectContaining({
        id: 'arena-bot',
        name: 'Aldren — Żelazna Pięść',
        challenge: expect.any(String),
        powerRatio: expect.any(Number),
        arenaRating: expect.any(Number),
        arenaRank: expect.objectContaining({
          title: expect.any(String),
          frame: expect.any(String),
        }),
      }));
      expect(prisma.bot.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          id: { notIn: ['previous-arena-bot', 'currently-visible-bot'] },
          reputation: { lt: 0 },
        }),
      }));
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('arena-benchmark:v5:combatant-weak:1'),
        expect.stringContaining('"power"'),
        'EX',
        expect.any(Number),
      );
    });

    it('liczy punkt odniesienia z najlepszego wyposażenia w plecaku', () => {
      const strongWeapon = {
        id: 'strong-weapon',
        slotGroup: 'WEAPON',
        weaponType: 'SWORD',
        strengthBonus: 0,
        agilityBonus: 0,
        enduranceBonus: 0,
        intelligenceBonus: 0,
        attackPower: 40,
        damageMin: 35,
        damageMax: 45,
        defensePower: 0,
        parryBonus: 0,
        maxHpBonus: 0,
        criticalChanceBonus: 0,
      };

      const selected = (service as any).selectStrongestOwnedEquipment(
        'combatant-weak',
        stats,
        5,
        [],
        [{
          id: 'owned-strong-weapon',
          combatantId: 'combatant-weak',
          itemId: strongWeapon.id,
          enhancementLevel: 0,
          socketCapacity: 1,
          unlockedSockets: 0,
          forgeFailStack: 0,
          createdAt: new Date(0),
          updatedAt: new Date(0),
          sockets: [],
          item: strongWeapon,
        }],
        [],
      );

      expect(selected).toEqual([
        expect.objectContaining({
          slot: 'WEAPON',
          ownedItem: expect.objectContaining({ itemId: 'strong-weapon' }),
        }),
      ]);
    });
  });

  describe('fightPlayer', () => {
    it('rzuca BadRequestException przy probie ataku samego siebie', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(weakCharacter);

      await expect(service.fightPlayer('user-1', weakCharacter.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rzuca NotFoundException, gdy przeciwnik nie istnieje', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(weakCharacter);
      charactersService.getById.mockImplementationOnce(() => {
        throw new NotFoundException('Postac nie istnieje');
      });

      await expect(service.fightPlayer('user-1', 'brak-postaci')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('zwyciezca zabiera zlota przegranemu i dostaje EXP', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(strongAttacker);
      charactersService.getById.mockResolvedValueOnce(weakCharacter);

      await service.fightPlayer('user-1', weakCharacter.id, ALWAYS_HIT_NO_CRIT_RNG);

      // 5% ze 100 = 5
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: strongAttacker.id },
        data: { gold: 105n },
      });
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: weakCharacter.id },
        data: { gold: 95n },
      });
      expect(charactersService.addExperience).toHaveBeenCalledWith(
        strongAttacker.id,
        weakCharacter.level * 10,
      );
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: strongAttacker.id },
        data: { reputation: -2 },
      });
    });

    it('wygrana z silniejszym przeciwnikiem podnosi reputacje atakujacego', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(underdogAttacker);
      charactersService.getById.mockResolvedValueOnce(strongerDefender);

      await service.fightPlayer('user-1', strongerDefender.id, ALWAYS_HIT_NO_CRIT_RNG);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: underdogAttacker.id },
        data: { reputation: 2 },
      });
    });

    it('remis (obie strony ciagle pudlujace) nie daje zadnych nagrod', async () => {
      charactersService.getByUserId.mockResolvedValueOnce(strongAttacker);
      charactersService.getById.mockResolvedValueOnce(balancedDefender);

      await service.fightPlayer('user-1', balancedDefender.id, ALWAYS_MISS_RNG);

      expect(prisma.character.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reputation: expect.any(Number) }),
        }),
      );
      expect(charactersService.addExperience).not.toHaveBeenCalled();
    });
  });
});
