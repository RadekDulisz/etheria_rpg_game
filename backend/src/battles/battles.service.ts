import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CombatantStats, EquipmentSlot, SlotGroup, WeaponType } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { OwnedItemWithDetails } from '../blacksmith/blacksmith.balance';
import { simulateBattle } from '../combat/battle-simulator';
import { buildCombatSnapshot, CombatEquipmentEntry } from '../combat/combat-snapshot.builder';
import {
  BASE_HIT_CHANCE,
  CRIT_DAMAGE_MULTIPLIER,
  WEAPON_EXPERTISE_XP_PER_HIT,
} from '../combat/combat.constants';
import { CombatSnapshot } from '../combat/combat.types';
import { calculateWeaponExpertiseProgress } from '../combat/weapon-expertise';
import {
  calculatePvpReputationDelta,
  getReputationRankDetails,
} from '../characters/reputation';
import { getCurrentHp } from '../characters/character-health';
import { calculatePropertyBonuses } from '../properties/property-bonuses';
import {
  calculateAttackRange,
  calculateCritChance,
  calculateEffectiveDefense,
  calculateMaxHp,
  calculateParryChance,
} from '../combat/combat-formulas';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SLOT_GROUP_TO_SLOTS } from '../inventory/slot-mapping';
import {
  ARENA_HP_COST_PERCENT,
  ARENA_MINIMUM_HP_PERCENT,
  calculateArenaHpCost,
  calculateArenaRatingChange,
  calculateArenaReputationReward,
  calculateArenaExperienceReward,
  calculateArenaGoldReward,
  canEnterArena,
  estimateArenaOpponentRating,
} from './arena-balance';
import { getArenaRankDetails, getNextArenaRankDetails } from './arena-ranks';

const ATTACK_COOLDOWN_SECONDS = 3;
const ATTACK_COOLDOWN_PREFIX = 'attack-cooldown:';
const ARENA_LAST_OPPONENT_PREFIX = 'arena-last-opponent:';
const ARENA_LAST_OPPONENT_TTL_SECONDS = 24 * 60 * 60;
const ARENA_BENCHMARK_PREFIX = 'arena-benchmark:v5:';
const ARENA_BENCHMARK_TTL_SECONDS = 30 * 24 * 60 * 60;
const PVP_GOLD_STEAL_RATE = 0.05;
const PVP_GOLD_STEAL_CAP = 500n;
const PVP_EXP_PER_DEFENDER_LEVEL = 10;

const EQUIPPED_ITEM_INCLUDE = {
  ownedItem: {
    include: {
      item: true,
      sockets: { include: { gemDefinition: true }, orderBy: { position: 'asc' as const } },
    },
  },
} as const;

const ARENA_NAMES = [
  'Aldren', 'Beren', 'Caelis', 'Darian', 'Eryk', 'Faelan', 'Garrik', 'Ivar',
  'Kael', 'Lucan', 'Marek', 'Nerian', 'Oskar', 'Roderik', 'Soren', 'Wulfram',
];
const ARENA_TITLES = [
  'Żelazna Pięść', 'Cień Areny', 'Strażnik Północy', 'Wilk Pogranicza',
  'Ostrze Zmierzchu', 'Bezchorągiewny', 'Kruk z Etherii', 'Syn Burzy',
];

interface ArenaCandidate {
  id: string;
  combatantId: string;
  name: string;
  level: number;
  expReward: number;
  goldReward: number;
  reputation: number;
  combatant: {
    stats: CombatantStats | null;
    equippedItems: Array<Parameters<typeof buildCombatSnapshot>[2][number]>;
    weaponExpertise: Parameters<typeof buildCombatSnapshot>[3];
  };
}

interface ArenaBenchmark {
  power: number;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    parryRating: number;
  };
  equipment: Array<{
    itemId: string;
    slot: EquipmentSlot;
    enhancementLevel: number;
    socketCapacity: number;
    unlockedSockets: number;
    gems: Array<{ position: number; gemDefinitionId: string }>;
  }>;
  expertise: Array<{ weaponType: WeaponType; experience: number; level: number }>;
}

@Injectable()
export class BattlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
    private readonly redis: RedisService,
  ) {}

  async getArenaOpponent(
    userId: string,
    rng: () => number = Math.random,
    excludeOpponentId?: string,
    preferredAlignment: 'GOOD' | 'EVIL' = 'EVIL',
  ) {
    const character = await this.charactersService.getByUserId(userId);
    const stats = character.combatant.stats;
    if (!stats) {
      throw new NotFoundException('Brak statystyk dla Twojej postaci');
    }

    const playerSnapshot = buildCombatSnapshot(
      character.combatantId,
      stats,
      character.combatant.equippedItems,
      character.combatant.weaponExpertise,
    );
    const playerPower = this.calculatePowerScore(playerSnapshot, character.level);
    const benchmark = await this.getOrCreateArenaBenchmark(character, stats);
    const lastOpponentId = await this.redis.get(`${ARENA_LAST_OPPONENT_PREFIX}${character.combatantId}`);
    const excludedOpponentIds = [...new Set(
      [lastOpponentId, excludeOpponentId].filter((id): id is string => Boolean(id)),
    )];
    const levelRadius = character.level < 5 ? 1 : 2;
    const candidates = await this.prisma.bot.findMany({
      where: {
        isActive: true,
        ...(excludedOpponentIds.length > 0 ? { id: { notIn: excludedOpponentIds } } : {}),
        // Rywale Areny mają formę imienia i przydomka oddzielonych pauzą.
        // Dzięki temu zwykłe potwory PvE nie trafiają do pojedynków bohaterów.
        name: { contains: '—' },
        reputation: preferredAlignment === 'GOOD' ? { gt: 0 } : { lt: 0 },
        level: { gte: Math.max(1, character.level - levelRadius), lte: character.level + levelRadius },
      },
      include: {
        combatant: {
          include: { stats: true, equippedItems: { include: EQUIPPED_ITEM_INCLUDE }, weaponExpertise: true },
        },
      },
      take: 40,
    });

    const ranked = (candidates as ArenaCandidate[])
      .filter((candidate) => candidate.combatant.stats)
      .map((candidate) => {
        const snapshot = buildCombatSnapshot(
          candidate.combatantId,
          candidate.combatant.stats!,
          candidate.combatant.equippedItems,
          candidate.combatant.weaponExpertise,
        );
        const power = this.calculatePowerScore(snapshot, candidate.level);
        return { candidate, snapshot, power, difference: Math.abs(power - benchmark.power) / benchmark.power };
      })
      .filter((entry) => entry.difference <= 0.2)
      .sort((left, right) => left.difference - right.difference);

    let selected = ranked.length > 0
      ? ranked[Math.floor(rng() * Math.min(5, ranked.length))]
      : null;
    if (!selected) {
      const candidate = await this.createArenaBot(
        character,
        benchmark,
        rng,
        preferredAlignment,
      );
      const snapshot = buildCombatSnapshot(
        candidate.combatantId,
        candidate.combatant.stats!,
        candidate.combatant.equippedItems,
        candidate.combatant.weaponExpertise,
      );
      const power = this.calculatePowerScore(snapshot, candidate.level);
      selected = { candidate, snapshot, power, difference: Math.abs(power - benchmark.power) / benchmark.power };
    }

    const characterHealth = this.getArenaHealth(character, playerSnapshot);
    const entryHpCost = calculateArenaHpCost(characterHealth.maxHp);
    return {
      ...this.toArenaOpponent(
        selected.candidate,
        selected.snapshot,
        playerPower,
        selected.power,
        character.arenaRating ?? 1000,
      ),
      entryHpCost,
      currentHp: characterHealth.currentHp,
      maxHp: characterHealth.maxHp,
      canFight: canEnterArena(characterHealth.currentHp, characterHealth.maxHp),
    };
  }

  async fightBot(
    userId: string,
    botId: string,
    rng: () => number = Math.random,
    arena = false,
  ) {
    const character = await this.charactersService.getByUserId(userId);
    const attackerStats = character.combatant.stats;
    if (!attackerStats) {
      throw new NotFoundException('Brak statystyk dla Twojej postaci');
    }

    const initialSnapshot = buildCombatSnapshot(
      character.combatantId,
      attackerStats,
      character.combatant.equippedItems,
      character.combatant.weaponExpertise ?? [],
    );
    const characterHealth = this.getArenaHealth(character, initialSnapshot);
    const arenaHpCost = arena ? calculateArenaHpCost(characterHealth.maxHp) : 0;
    if (arena && !canEnterArena(characterHealth.currentHp, characterHealth.maxHp)) {
      throw new ConflictException(
        `Bohater potrzebuje więcej niż ${ARENA_MINIMUM_HP_PERCENT}% HP, aby wejść na arenę`,
      );
    }

    await this.checkAndSetCooldown(character.combatantId);

    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        combatant: { include: { stats: true, equippedItems: { include: EQUIPPED_ITEM_INCLUDE } } },
      },
    });
    if (!bot || !bot.isActive || !bot.combatant.stats) {
      throw new NotFoundException('Przeciwnik nie istnieje lub jest niedostępny');
    }
    const arenaOpponent = bot.name.includes('—') || bot.name.includes('â€”');
    if (arenaOpponent !== arena) {
      throw new BadRequestException(
        arenaOpponent
          ? 'Rywala areny można zaatakować wyłącznie przez bramę areny'
          : 'Ten przeciwnik nie walczy na arenie',
      );
    }

    const attackerSnapshot = await this.buildSnapshotFor(character.combatantId, attackerStats);
    const defenderSnapshot = await this.buildSnapshotFor(bot.combatantId, bot.combatant.stats);
    const previousExpertise = attackerSnapshot.weaponType
      ? character.combatant.weaponExpertise?.find(
          (entry) => entry.weaponType === attackerSnapshot.weaponType,
        )
      : undefined;

    const simulation = simulateBattle(
      attackerSnapshot,
      character.level,
      defenderSnapshot,
      bot.level,
      rng,
    );

    const attackerWon = simulation.result === 'ATTACKER_WIN';
    const arenaReputationChange = arena
      ? calculateArenaReputationReward(bot.reputation, attackerWon)
      : 0;
    const expReward = attackerWon ? calculateArenaExperienceReward(bot.level) : 0;
    const goldReward = attackerWon ? calculateArenaGoldReward(bot.level) : 0;
    const expertiseExperienceGained = attackerSnapshot.weaponType
      ? simulation.attackerHitsLanded * WEAPON_EXPERTISE_XP_PER_HIT
      : 0;
    const expertiseExperienceAfter =
      (previousExpertise?.experience ?? 0) + expertiseExperienceGained;
    const previousExpertiseProgress = calculateWeaponExpertiseProgress(
      previousExpertise?.experience ?? 0,
    );
    const expertiseProgressAfter = calculateWeaponExpertiseProgress(
      expertiseExperienceAfter,
    );
    const arenaRatingChange = arena
      ? calculateArenaRatingChange(
          character.arenaRating ?? 1000,
          this.calculatePowerScore(attackerSnapshot, character.level),
          this.calculatePowerScore(defenderSnapshot, bot.level),
          simulation.result,
        )
      : 0;
    const arenaRatingAfter = Math.max(
      0,
      (character.arenaRating ?? 1000) + arenaRatingChange,
    );
    const arenaHpAfter = arena
      ? Math.max(1, characterHealth.currentHp - arenaHpCost)
      : characterHealth.currentHp;
    const finishedAt = new Date();

    const battle = await this.prisma.$transaction(async (tx) => {
      const createdBattle = await tx.battle.create({
        data: {
          type: 'PVE',
          attackerId: character.combatantId,
          defenderId: bot.combatantId,
          result: simulation.result,
          expReward,
          goldReward,
          finishedAt,
          rounds: { create: simulation.rounds },
        },
        include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      });

      const newGold = character.gold + BigInt(goldReward);
      if (arena) {
        await tx.character.update({
          where: { id: character.id },
          data: {
            gold: newGold,
            currentHp: arenaHpAfter,
            healthUpdatedAt: finishedAt,
            arenaRating: arenaRatingAfter,
            arenaWins: simulation.result === 'ATTACKER_WIN' ? { increment: 1 } : undefined,
            arenaLosses: simulation.result === 'DEFENDER_WIN' ? { increment: 1 } : undefined,
            arenaDraws: simulation.result === 'DRAW' ? { increment: 1 } : undefined,
            reputation: arenaReputationChange !== 0
              ? { increment: arenaReputationChange }
              : undefined,
          },
        });
      } else if (goldReward > 0) {
        await tx.character.update({ where: { id: character.id }, data: { gold: newGold } });
      }
      if (goldReward > 0) {
        await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'BATTLE_REWARD',
            amount: BigInt(goldReward),
            balanceAfter: newGold,
            referenceId: createdBattle.id,
            description: `Nagroda za zwycięstwo nad przeciwnikiem: ${bot.name}`,
          },
        });
      }

      await this.recordWeaponExpertiseGain(
        tx,
        character.combatantId,
        attackerSnapshot,
        simulation.attackerHitsLanded,
      );

      return createdBattle;
    });

    // Poza glowna transakcja - patrz komentarz w docs/etap-06-silnik-walki.md
    // (znane, zaakceptowane uproszczenie).
    if (expReward > 0) {
      await this.charactersService.addExperience(character.id, expReward);
    }
    if (simulation.attackerHitsLanded > 0 && attackerSnapshot.weaponType) {
      await this.recalculateExpertiseLevel(character.combatantId, attackerSnapshot.weaponType);
    }
    await this.redis.set(
      `${ARENA_LAST_OPPONENT_PREFIX}${character.combatantId}`,
      bot.id,
      'EX',
      ARENA_LAST_OPPONENT_TTL_SECONDS,
    );

    return {
      ...battle,
      attacker: {
        combatantId: character.combatantId,
        name: character.name,
        level: character.level,
        maxHp: calculateMaxHp(attackerSnapshot.endurance, character.level, attackerSnapshot.maxHpBonus),
      },
      defender: {
        combatantId: bot.combatantId,
        name: bot.name,
        level: bot.level,
        maxHp: calculateMaxHp(defenderSnapshot.endurance, bot.level, defenderSnapshot.maxHpBonus),
      },
      expertiseReward: attackerSnapshot.weaponType
        ? {
            weaponType: attackerSnapshot.weaponType,
            experienceGained: expertiseExperienceGained,
            experienceAfter: expertiseExperienceAfter,
            levelBefore: previousExpertiseProgress.level,
            levelAfter: expertiseProgressAfter.level,
            leveledUp: expertiseProgressAfter.level > previousExpertiseProgress.level,
          }
        : null,
      arenaProfile: arena
        ? {
            ratingBefore: character.arenaRating ?? 1000,
            ratingChange: arenaRatingAfter - (character.arenaRating ?? 1000),
            ratingAfter: arenaRatingAfter,
            rank: getArenaRankDetails(arenaRatingAfter),
            nextRank: getNextArenaRankDetails(arenaRatingAfter),
            wins: (character.arenaWins ?? 0) + (simulation.result === 'ATTACKER_WIN' ? 1 : 0),
            losses:
              (character.arenaLosses ?? 0) + (simulation.result === 'DEFENDER_WIN' ? 1 : 0),
            draws: (character.arenaDraws ?? 0) + (simulation.result === 'DRAW' ? 1 : 0),
            hpCost: arenaHpCost,
            hpAfter: arenaHpAfter,
            maxHp: characterHealth.maxHp,
            reputationChange: arenaReputationChange,
            reputationAfter: character.reputation + arenaReputationChange,
            reputationRank: getReputationRankDetails(
              character.reputation + arenaReputationChange,
            ),
          }
        : null,
    };
  }

  async getArenaProfile(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const rating = character.arenaRating ?? 1000;
    const nextRank = getNextArenaRankDetails(rating);
    const [position, leaders] = await Promise.all([
      this.prisma.character.count({
        where: { arenaRating: { gt: rating } },
      }),
      this.prisma.character.findMany({
        orderBy: [{ arenaRating: 'desc' }, { arenaWins: 'desc' }, { name: 'asc' }],
        take: 8,
        select: {
          id: true,
          name: true,
          level: true,
          arenaRating: true,
          arenaWins: true,
          arenaLosses: true,
          arenaDraws: true,
        },
      }),
    ]);
    return {
      characterId: character.id,
      rating,
      wins: character.arenaWins ?? 0,
      losses: character.arenaLosses ?? 0,
      draws: character.arenaDraws ?? 0,
      position: position + 1,
      rank: getArenaRankDetails(rating),
      nextRank,
      pointsToNextRank: nextRank ? nextRank.threshold - rating : 0,
      hpCostPercent: ARENA_HP_COST_PERCENT,
      minimumHpPercent: ARENA_MINIMUM_HP_PERCENT,
      leaderboard: leaders.map((entry, index) => ({
        ...entry,
        position: index + 1,
        rank: getArenaRankDetails(entry.arenaRating),
      })),
    };
  }

  /**
   * Walka PvP - asynchroniczna, rozstrzygana natychmiast (przeciwnik nie
   * musi byc online, patrz docs/erd-05-battle.md). Zwyciezca zabiera
   * czesc zlota przeciwnika oraz EXP zalezny od jego poziomu; remis/
   * porazka nie daje nagrod (obrona bez nagrody - swiadome uproszczenie
   * na ten etap).
   */
  async fightPlayer(userId: string, targetCharacterId: string, rng: () => number = Math.random) {
    const attacker = await this.charactersService.getByUserId(userId);
    if (attacker.id === targetCharacterId) {
      throw new BadRequestException('Nie możesz zaatakować własnej postaci');
    }

    const attackerStats = attacker.combatant.stats;
    if (!attackerStats) {
      throw new NotFoundException('Brak statystyk dla Twojej postaci');
    }

    await this.checkAndSetCooldown(attacker.combatantId);

    const target = await this.charactersService.getById(targetCharacterId);
    const targetStats = target.combatant.stats;
    if (!targetStats) {
      throw new NotFoundException('Przeciwnik nie ma statystyk');
    }

    const attackerSnapshot = await this.buildSnapshotFor(attacker.combatantId, attackerStats);
    const defenderSnapshot = await this.buildSnapshotFor(target.combatantId, targetStats);

    const simulation = simulateBattle(
      attackerSnapshot,
      attacker.level,
      defenderSnapshot,
      target.level,
      rng,
    );

    const attackerWon = simulation.result === 'ATTACKER_WIN';
    const goldStolen = attackerWon ? this.calculateGoldSteal(target.gold) : 0n;
    const expReward = attackerWon ? target.level * PVP_EXP_PER_DEFENDER_LEVEL : 0;
    const reputationDelta = calculatePvpReputationDelta(attacker.level, target.level, attackerWon);

    const battle = await this.prisma.$transaction(async (tx) => {
      const createdBattle = await tx.battle.create({
        data: {
          type: 'PVP',
          attackerId: attacker.combatantId,
          defenderId: target.combatantId,
          result: simulation.result,
          expReward,
          goldReward: Number(goldStolen),
          finishedAt: new Date(),
          rounds: { create: simulation.rounds },
        },
        include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      });

      if (goldStolen > 0n) {
        const attackerNewGold = attacker.gold + goldStolen;
        const targetNewGold = target.gold - goldStolen;

        await tx.character.update({
          where: { id: attacker.id },
          data: { gold: attackerNewGold },
        });
        await tx.character.update({ where: { id: target.id }, data: { gold: targetNewGold } });

        await tx.transaction.create({
          data: {
            characterId: attacker.id,
            type: 'BATTLE_REWARD',
            amount: goldStolen,
            balanceAfter: attackerNewGold,
            referenceId: createdBattle.id,
            description: `Łup z wygranego pojedynku przeciwko postaci ${target.name}`,
          },
        });
        await tx.transaction.create({
          data: {
            characterId: target.id,
            type: 'BATTLE_REWARD',
            amount: -goldStolen,
            balanceAfter: targetNewGold,
            referenceId: createdBattle.id,
            description: `Złoto utracone w pojedynku z postacią ${attacker.name}`,
          },
        });
      }

      if (reputationDelta !== 0) {
        await tx.character.update({
          where: { id: attacker.id },
          data: { reputation: attacker.reputation + reputationDelta },
        });
      }

      await this.recordWeaponExpertiseGain(
        tx,
        attacker.combatantId,
        attackerSnapshot,
        simulation.attackerHitsLanded,
      );

      return createdBattle;
    });

    if (expReward > 0) {
      await this.charactersService.addExperience(attacker.id, expReward);
    }
    if (simulation.attackerHitsLanded > 0 && attackerSnapshot.weaponType) {
      await this.recalculateExpertiseLevel(attacker.combatantId, attackerSnapshot.weaponType);
    }

    return battle;
  }

  async getById(battleId: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
    if (!battle) {
      throw new NotFoundException('Walka nie istnieje');
    }
    return battle;
  }

  /**
   * Prosty cooldown ataku w Redis - chroni przed spamowaniem endpointu
   * atakow (dodatkowo do globalnego rate limitingu), zgodnie z sekcja 9
   * instrukcji projektowych.
   */
  private async checkAndSetCooldown(combatantId: string): Promise<void> {
    const key = `${ATTACK_COOLDOWN_PREFIX}${combatantId}`;
    const active = await this.redis.get(key);
    if (active) {
      throw new ConflictException('Atakujesz zbyt szybko — odczekaj chwilę');
    }
    await this.redis.set(key, '1', 'EX', ATTACK_COOLDOWN_SECONDS);
  }

  private async buildSnapshotFor(
    combatantId: string,
    stats: CombatantStats,
  ): Promise<CombatSnapshot> {
    const [equipped, expertise] = await Promise.all([
      this.prisma.equippedItem.findMany({
        where: { combatantId },
        include: EQUIPPED_ITEM_INCLUDE,
      }),
      this.prisma.combatantWeaponExpertise.findMany({ where: { combatantId } }),
    ]);
    return buildCombatSnapshot(combatantId, stats, equipped, expertise);
  }

  private calculatePowerScore(snapshot: CombatSnapshot, level: number): number {
    const hp = calculateMaxHp(snapshot.endurance, level, snapshot.maxHpBonus ?? 0);
    const attack = calculateAttackRange(snapshot);
    const averageDamage = (attack.min + attack.max) / 2;
    const criticalMultiplier = 1 + calculateCritChance(snapshot) * (CRIT_DAMAGE_MULTIPLIER - 1);
    const expectedDamage = averageDamage * BASE_HIT_CHANCE * criticalMultiplier;
    const parryDurability = hp * calculateParryChance(snapshot) * 0.35;
    return Math.max(
      1,
      hp * 0.24 +
        expectedDamage * 4 +
        calculateEffectiveDefense(snapshot) * 3 +
        parryDurability,
    );
  }

  private getArenaHealth(
    character: Awaited<ReturnType<CharactersService['getByUserId']>>,
    snapshot: CombatSnapshot,
  ): { currentHp: number; maxHp: number } {
    const maxHp = calculateMaxHp(
      snapshot.endurance,
      character.level,
      snapshot.maxHpBonus ?? 0,
    );
    const regenMultiplier = calculatePropertyBonuses(
      character.property?.level,
      character.reputation,
    ).regenMultiplier;
    return {
      maxHp,
      currentHp: getCurrentHp(
        character.currentHp ?? null,
        maxHp,
        character.healthUpdatedAt ?? new Date(),
        new Date(),
        regenMultiplier,
      ),
    };
  }

  private async createArenaBot(
    character: Awaited<ReturnType<CharactersService['getByUserId']>>,
    benchmark: ArenaBenchmark,
    rng: () => number,
    preferredAlignment: 'GOOD' | 'EVIL',
  ): Promise<ArenaCandidate> {
    const levelShift = character.level < 3 ? 0 : Math.floor(rng() * 3) - 1;
    const level = Math.max(1, character.level + levelShift);
    const primary = ['strength', 'agility', 'endurance', 'intelligence'][Math.floor(rng() * 4)] as
      | 'strength' | 'agility' | 'endurance' | 'intelligence';
    const generatedStats = {
      strength: Math.max(1, benchmark.stats.strength + Math.floor(rng() * 3) - 1),
      agility: Math.max(1, benchmark.stats.agility + Math.floor(rng() * 3) - 1),
      endurance: Math.max(1, benchmark.stats.endurance + Math.floor(rng() * 3) - 1),
      intelligence: Math.max(1, benchmark.stats.intelligence + Math.floor(rng() * 3) - 1),
      parryRating: Math.max(0, benchmark.stats.parryRating + Math.floor(rng() * 3) - 1),
    };
    generatedStats[primary] += 1;
    const name = `${ARENA_NAMES[Math.floor(rng() * ARENA_NAMES.length)]} — ${ARENA_TITLES[Math.floor(rng() * ARENA_TITLES.length)]}`;
    const reputationMagnitude = 25 + Math.floor(rng() * 1176);
    const reputation = preferredAlignment === 'GOOD'
      ? reputationMagnitude
      : -reputationMagnitude;

    const botId = await this.prisma.$transaction(async (tx) => {
      const combatant = await tx.combatant.create({ data: { type: 'BOT' } });
      await tx.combatantStats.create({ data: { combatantId: combatant.id, ...generatedStats } });
      for (const entry of benchmark.equipment) {
        const ownedItem = await tx.ownedItem.create({
          data: {
            combatantId: combatant.id,
            itemId: entry.itemId,
            enhancementLevel: entry.enhancementLevel ?? 0,
            socketCapacity: entry.socketCapacity ?? 0,
            unlockedSockets: entry.unlockedSockets ?? 0,
          },
        });
        if (entry.gems?.length) {
          await tx.itemSocket.createMany({
            data: entry.gems.map((gem) => ({
              ownedItemId: ownedItem.id,
              position: gem.position,
              gemDefinitionId: gem.gemDefinitionId,
            })),
          });
        }
        await tx.equippedItem.create({
          data: { combatantId: combatant.id, ownedItemId: ownedItem.id, slot: entry.slot },
        });
      }
      if (benchmark.expertise.length > 0) {
        await tx.combatantWeaponExpertise.createMany({
          data: benchmark.expertise.map((expertise) => ({
            combatantId: combatant.id,
            weaponType: expertise.weaponType,
            experience: expertise.experience,
            level: expertise.level,
          })),
        });
      }
      const bot = await tx.bot.create({
        data: {
          combatantId: combatant.id,
          name,
          level,
          expReward: calculateArenaExperienceReward(level),
          goldReward: calculateArenaGoldReward(level),
          reputation,
        },
      });
      return bot.id;
    });

    return this.prisma.bot.findUniqueOrThrow({
      where: { id: botId },
      include: {
        combatant: {
          include: { stats: true, equippedItems: { include: EQUIPPED_ITEM_INCLUDE }, weaponExpertise: true },
        },
      },
    }) as Promise<ArenaCandidate>;
  }

  private async getOrCreateArenaBenchmark(
    character: Awaited<ReturnType<CharactersService['getByUserId']>>,
    stats: CombatantStats,
  ): Promise<ArenaBenchmark> {
    const key = `${ARENA_BENCHMARK_PREFIX}${character.combatantId}:${character.level}`;
    const stored = await this.redis.get(key);
    if (stored) {
      try {
        return JSON.parse(stored) as ArenaBenchmark;
      } catch {
        // Uszkodzony lub pochodzący ze starszej wersji wpis zostanie zastąpiony.
      }
    }

    const inventory = await this.prisma.ownedItem.findMany({
      where: { combatantId: character.combatantId, equippedEntry: null },
      include: {
        item: true,
        sockets: { include: { gemDefinition: true }, orderBy: { position: 'asc' } },
      },
    });
    const strongestOwnedEquipment = this.selectStrongestOwnedEquipment(
      character.combatantId,
      stats,
      character.level,
      character.combatant.equippedItems,
      inventory,
      character.combatant.weaponExpertise,
    );
    const strongestOwnedSnapshot = buildCombatSnapshot(
      character.combatantId,
      stats,
      strongestOwnedEquipment,
      character.combatant.weaponExpertise,
    );

    const benchmark: ArenaBenchmark = {
      power: this.calculatePowerScore(strongestOwnedSnapshot, character.level),
      stats: {
        strength: stats.strength,
        agility: stats.agility,
        endurance: stats.endurance,
        intelligence: stats.intelligence,
        parryRating: stats.parryRating,
      },
      equipment: strongestOwnedEquipment.map((entry) => ({
        itemId: entry.ownedItem!.itemId,
        slot: entry.slot,
        enhancementLevel: entry.ownedItem!.enhancementLevel,
        socketCapacity: entry.ownedItem!.socketCapacity,
        unlockedSockets: entry.ownedItem!.unlockedSockets,
        gems: entry.ownedItem!.sockets
          .filter((socket) => socket.gemDefinitionId !== null)
          .map((socket) => ({
            position: socket.position,
            gemDefinitionId: socket.gemDefinitionId!,
          })),
      })),
      expertise: character.combatant.weaponExpertise.map((entry) => ({
        weaponType: entry.weaponType,
        experience: entry.experience,
        level: entry.level,
      })),
    };
    await this.redis.set(key, JSON.stringify(benchmark), 'EX', ARENA_BENCHMARK_TTL_SECONDS);
    return benchmark;
  }

  /**
   * Punkt odniesienia Areny uwzględnia najlepszy możliwy zestaw ze wszystkich
   * posiadanych egzemplarzy. Dzięki temu zdjęcie wyposażenia przed awansem nie
   * obniża siły przyszłych rywali. Zestaw pozostaje zamrożony do następnego
   * poziomu, więc przedmioty zdobyte później nadal dają realną przewagę.
   */
  private selectStrongestOwnedEquipment(
    combatantId: string,
    stats: CombatantStats,
    level: number,
    equippedItems: CombatEquipmentEntry[],
    inventoryItems: OwnedItemWithDetails[],
    expertise: Parameters<typeof buildCombatSnapshot>[3],
  ): CombatEquipmentEntry[] {
    const ownedInstances: OwnedItemWithDetails[] = [
      ...equippedItems
        .map((entry) => entry.ownedItem)
        .filter((entry): entry is OwnedItemWithDetails => Boolean(entry)),
      ...inventoryItems,
    ];
    const basePower = this.calculatePowerScore(
      buildCombatSnapshot(combatantId, stats, [], expertise),
      level,
    );
    const itemScore = (ownedItem: OwnedItemWithDetails, slot: EquipmentSlot): number => {
      const virtualEntry: CombatEquipmentEntry = { slot, ownedItem };
      const snapshot = buildCombatSnapshot(combatantId, stats, [virtualEntry], expertise);
      return this.calculatePowerScore(snapshot, level) - basePower;
    };

    const result: CombatEquipmentEntry[] = [];
    for (const [slotGroup, slots] of Object.entries(SLOT_GROUP_TO_SLOTS) as Array<
      [SlotGroup, EquipmentSlot[]]
    >) {
      const candidates = ownedInstances
        .filter((ownedItem) => ownedItem.item.slotGroup === slotGroup)
        .map((ownedItem, index) => ({
          ownedItem,
          index,
          score: itemScore(ownedItem, slots[0]),
        }))
        .sort((left, right) => right.score - left.score || left.index - right.index);

      slots.forEach((slot, index) => {
        const selected = candidates[index]?.ownedItem;
        if (!selected) return;
        result.push({ slot, ownedItem: selected });
      });
    }
    return result;
  }

  private toArenaOpponent(
    bot: ArenaCandidate,
    snapshot: CombatSnapshot,
    playerPower: number,
    opponentPower: number,
    playerRating: number,
  ) {
    const ratio = opponentPower / playerPower;
    const attack = calculateAttackRange(snapshot);
    const arenaRating = estimateArenaOpponentRating(
      playerRating,
      playerPower,
      opponentPower,
    );
    return {
      id: bot.id,
      combatantId: bot.combatantId,
      name: bot.name,
      level: bot.level,
      maxHp: calculateMaxHp(snapshot.endurance, bot.level, snapshot.maxHpBonus ?? 0),
      expReward: calculateArenaExperienceReward(bot.level),
      goldReward: calculateArenaGoldReward(bot.level),
      challenge: ratio < 0.93 ? 'KORZYSTNY' : ratio > 1.07 ? 'WYMAGAJĄCY' : 'WYRÓWNANY',
      powerRatio: Math.round(ratio * 100),
      arenaRating,
      arenaRank: getArenaRankDetails(arenaRating),
      reputation: bot.reputation,
      reputationRank: getReputationRankDetails(bot.reputation),
      stats: {
        strength: snapshot.strength,
        agility: snapshot.agility,
        endurance: snapshot.endurance,
        intelligence: snapshot.intelligence,
        attack: Math.round((attack.min + attack.max) / 2),
        attackMin: attack.min,
        attackMax: attack.max,
        defense: calculateEffectiveDefense(snapshot),
      },
    };
  }

  private calculateGoldSteal(targetGold: bigint): bigint {
    const raw = (targetGold * BigInt(Math.round(PVP_GOLD_STEAL_RATE * 100))) / 100n;
    return raw > PVP_GOLD_STEAL_CAP ? PVP_GOLD_STEAL_CAP : raw;
  }

  private async recordWeaponExpertiseGain(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    combatantId: string,
    attackerSnapshot: CombatSnapshot,
    hitsLanded: number,
  ): Promise<void> {
    if (hitsLanded === 0 || !attackerSnapshot.weaponType) {
      return;
    }
    await tx.combatantWeaponExpertise.upsert({
      where: {
        combatantId_weaponType: { combatantId, weaponType: attackerSnapshot.weaponType },
      },
      create: {
        combatantId,
        weaponType: attackerSnapshot.weaponType,
        experience: hitsLanded * WEAPON_EXPERTISE_XP_PER_HIT,
        level: 1,
      },
      update: {
        experience: { increment: hitsLanded * WEAPON_EXPERTISE_XP_PER_HIT },
      },
    });
  }

  private async recalculateExpertiseLevel(
    combatantId: string,
    weaponType: WeaponType,
  ): Promise<void> {
    const expertise = await this.prisma.combatantWeaponExpertise.findUnique({
      where: { combatantId_weaponType: { combatantId, weaponType } },
    });
    if (!expertise) {
      return;
    }
    const level = calculateWeaponExpertiseProgress(expertise.experience).level;
    if (level !== expertise.level) {
      await this.prisma.combatantWeaponExpertise.update({
        where: { combatantId_weaponType: { combatantId, weaponType } },
        data: { level },
      });
    }
  }
}
