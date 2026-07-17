import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CombatantStats, WeaponType } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { simulateBattle } from '../combat/battle-simulator';
import { buildCombatSnapshot } from '../combat/combat-snapshot.builder';
import {
  WEAPON_EXPERTISE_XP_PER_HIT,
  WEAPON_EXPERTISE_XP_PER_LEVEL,
} from '../combat/combat.constants';
import { CombatSnapshot } from '../combat/combat.types';
import { calculatePvpReputationDelta } from '../characters/reputation';
import { calculateMaxHp } from '../combat/combat-formulas';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const ATTACK_COOLDOWN_SECONDS = 3;
const ATTACK_COOLDOWN_PREFIX = 'attack-cooldown:';

const PVP_GOLD_STEAL_RATE = 0.05;
const PVP_GOLD_STEAL_CAP = 500n;
const PVP_EXP_PER_DEFENDER_LEVEL = 10;

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
  combatant: {
    stats: CombatantStats | null;
    equippedItems: Array<Parameters<typeof buildCombatSnapshot>[2][number]>;
    weaponExpertise: Parameters<typeof buildCombatSnapshot>[3];
  };
}

@Injectable()
export class BattlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
    private readonly redis: RedisService,
  ) {}

  async getArenaOpponent(userId: string, rng: () => number = Math.random) {
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
    const levelRadius = character.level < 5 ? 1 : 2;
    const candidates = await this.prisma.bot.findMany({
      where: {
        isActive: true,
        // Rywale Areny mają formę imienia i przydomka oddzielonych pauzą.
        // Dzięki temu zwykłe potwory PvE nie trafiają do pojedynków bohaterów.
        name: { contains: '—' },
        level: { gte: Math.max(1, character.level - levelRadius), lte: character.level + levelRadius },
      },
      include: {
        combatant: {
          include: { stats: true, equippedItems: { include: { item: true } }, weaponExpertise: true },
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
        return { candidate, snapshot, power, difference: Math.abs(power - playerPower) / playerPower };
      })
      .filter((entry) => entry.difference <= 0.2)
      .sort((left, right) => left.difference - right.difference);

    let selected = ranked.length >= 4
      ? ranked[Math.floor(rng() * Math.min(5, ranked.length))]
      : null;
    if (!selected) {
      const candidate = await this.createArenaBot(character, stats, rng);
      const snapshot = buildCombatSnapshot(
        candidate.combatantId,
        candidate.combatant.stats!,
        candidate.combatant.equippedItems,
        candidate.combatant.weaponExpertise,
      );
      const power = this.calculatePowerScore(snapshot, candidate.level);
      selected = { candidate, snapshot, power, difference: Math.abs(power - playerPower) / playerPower };
    }

    return this.toArenaOpponent(selected.candidate, selected.snapshot, playerPower, selected.power);
  }

  async fightBot(userId: string, botId: string, rng: () => number = Math.random) {
    const character = await this.charactersService.getByUserId(userId);
    const attackerStats = character.combatant.stats;
    if (!attackerStats) {
      throw new NotFoundException('Brak statystyk dla Twojej postaci');
    }

    await this.checkAndSetCooldown(character.combatantId);

    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        combatant: { include: { stats: true, equippedItems: { include: { item: true } } } },
      },
    });
    if (!bot || !bot.isActive || !bot.combatant.stats) {
      throw new NotFoundException('Przeciwnik nie istnieje lub jest niedostępny');
    }

    const attackerSnapshot = await this.buildSnapshotFor(character.combatantId, attackerStats);
    const defenderSnapshot = await this.buildSnapshotFor(bot.combatantId, bot.combatant.stats);

    const simulation = simulateBattle(
      attackerSnapshot,
      character.level,
      defenderSnapshot,
      bot.level,
      rng,
    );

    const attackerWon = simulation.result === 'ATTACKER_WIN';
    const expReward = attackerWon ? bot.expReward : 0;
    const goldReward = attackerWon ? bot.goldReward : 0;

    const battle = await this.prisma.$transaction(async (tx) => {
      const createdBattle = await tx.battle.create({
        data: {
          type: 'PVE',
          attackerId: character.combatantId,
          defenderId: bot.combatantId,
          result: simulation.result,
          expReward,
          goldReward,
          finishedAt: new Date(),
          rounds: { create: simulation.rounds },
        },
        include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      });

      if (goldReward > 0) {
        const newGold = character.gold + BigInt(goldReward);
        await tx.character.update({ where: { id: character.id }, data: { gold: newGold } });
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
        include: { item: true },
      }),
      this.prisma.combatantWeaponExpertise.findMany({ where: { combatantId } }),
    ]);
    return buildCombatSnapshot(combatantId, stats, equipped, expertise);
  }

  private calculatePowerScore(snapshot: CombatSnapshot, level: number): number {
    const hp = calculateMaxHp(snapshot.endurance, level, snapshot.maxHpBonus ?? 0);
    const averageDamage = ((snapshot.damageMin ?? snapshot.attackPower) + (snapshot.damageMax ?? snapshot.attackPower)) / 2;
    return Math.max(1, hp * 0.24 + averageDamage * 4 + snapshot.defensePower * 3 + snapshot.agility * 1.5 + snapshot.parryRating * 2);
  }

  private async createArenaBot(
    character: Awaited<ReturnType<CharactersService['getByUserId']>>,
    stats: CombatantStats,
    rng: () => number,
  ): Promise<ArenaCandidate> {
    const levelShift = character.level < 3 ? 0 : Math.floor(rng() * 3) - 1;
    const level = Math.max(1, character.level + levelShift);
    const primary = ['strength', 'agility', 'endurance', 'intelligence'][Math.floor(rng() * 4)] as
      | 'strength' | 'agility' | 'endurance' | 'intelligence';
    const generatedStats = {
      strength: Math.max(1, stats.strength + Math.floor(rng() * 3) - 1),
      agility: Math.max(1, stats.agility + Math.floor(rng() * 3) - 1),
      endurance: Math.max(1, stats.endurance + Math.floor(rng() * 3) - 1),
      intelligence: Math.max(1, stats.intelligence + Math.floor(rng() * 3) - 1),
      parryRating: Math.max(0, stats.parryRating + Math.floor(rng() * 3) - 1),
    };
    generatedStats[primary] += 1;
    const name = `${ARENA_NAMES[Math.floor(rng() * ARENA_NAMES.length)]} — ${ARENA_TITLES[Math.floor(rng() * ARENA_TITLES.length)]}`;

    const botId = await this.prisma.$transaction(async (tx) => {
      const combatant = await tx.combatant.create({ data: { type: 'BOT' } });
      await tx.combatantStats.create({ data: { combatantId: combatant.id, ...generatedStats } });
      if (character.combatant.equippedItems.length > 0) {
        await tx.equippedItem.createMany({
          data: character.combatant.equippedItems.map((entry) => ({
            combatantId: combatant.id,
            itemId: entry.itemId,
            slot: entry.slot,
          })),
        });
      }
      const bot = await tx.bot.create({
        data: {
          combatantId: combatant.id,
          name,
          level,
          expReward: 5 + level * 4,
          goldReward: 8 + level * 3,
        },
      });
      return bot.id;
    });

    return this.prisma.bot.findUniqueOrThrow({
      where: { id: botId },
      include: {
        combatant: {
          include: { stats: true, equippedItems: { include: { item: true } }, weaponExpertise: true },
        },
      },
    }) as Promise<ArenaCandidate>;
  }

  private toArenaOpponent(
    bot: ArenaCandidate,
    snapshot: CombatSnapshot,
    playerPower: number,
    opponentPower: number,
  ) {
    const ratio = opponentPower / playerPower;
    return {
      id: bot.id,
      combatantId: bot.combatantId,
      name: bot.name,
      level: bot.level,
      maxHp: calculateMaxHp(snapshot.endurance, bot.level, snapshot.maxHpBonus ?? 0),
      expReward: bot.expReward,
      goldReward: bot.goldReward,
      challenge: ratio < 0.93 ? 'KORZYSTNY' : ratio > 1.07 ? 'WYMAGAJĄCY' : 'WYRÓWNANY',
      powerRatio: Math.round(ratio * 100),
      stats: {
        strength: snapshot.strength,
        agility: snapshot.agility,
        endurance: snapshot.endurance,
        intelligence: snapshot.intelligence,
        attack: Math.round(((snapshot.damageMin ?? snapshot.attackPower) + (snapshot.damageMax ?? snapshot.attackPower)) / 2),
        defense: snapshot.defensePower,
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
    const level = 1 + Math.floor(expertise.experience / WEAPON_EXPERTISE_XP_PER_LEVEL);
    if (level !== expertise.level) {
      await this.prisma.combatantWeaponExpertise.update({
        where: { combatantId_weaponType: { combatantId, weaponType } },
        data: { level },
      });
    }
  }
}
