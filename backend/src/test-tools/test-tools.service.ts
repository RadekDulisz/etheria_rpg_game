import { BadRequestException, Injectable } from '@nestjs/common';
import { WeaponType } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { toCharacterResponse } from '../characters/characters.mapper';
import { STAT_POINTS_PER_LEVEL } from '../characters/leveling';
import {
  experienceToNextExpertiseLevel,
} from '../combat/weapon-expertise';
import { MAX_WEAPON_EXPERTISE_LEVEL } from '../combat/combat.constants';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TavernService } from '../tavern/tavern.service';
import { ExecuteTestToolDto, TestToolAction } from './dto/execute-test-tool.dto';

const MAX_CHARACTER_LEVEL = 84;
const MAX_REPUTATION = 10_000;
const ATTACK_COOLDOWN_PREFIX = 'attack-cooldown:';

function requiredValue(dto: ExecuteTestToolDto): number {
  if (dto.value === undefined) throw new BadRequestException('Ta operacja wymaga wartości');
  return dto.value;
}

function maxExpertiseExperience(): number {
  let total = 0;
  for (let level = 1; level < MAX_WEAPON_EXPERTISE_LEVEL; level += 1) {
    total += experienceToNextExpertiseLevel(level);
  }
  return total;
}

@Injectable()
export class TestToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly charactersService: CharactersService,
    private readonly tavernService: TavernService,
  ) {}

  async execute(userId: string, dto: ExecuteTestToolDto) {
    const character = await this.charactersService.getByUserId(userId);
    const stats = character.combatant.stats;
    if (!stats) throw new BadRequestException('Postać nie ma statystyk');

    let message = 'Zastosowano zmianę testową';
    switch (dto.action) {
      case TestToolAction.ADD_GOLD: {
        const amount = requiredValue(dto);
        const balanceAfter = character.gold + BigInt(amount);
        if (balanceAfter < 0n) throw new BadRequestException('Stan złota nie może być ujemny');
        await this.prisma.$transaction([
          this.prisma.character.update({ where: { id: character.id }, data: { gold: balanceAfter } }),
          this.prisma.transaction.create({
            data: {
              characterId: character.id,
              type: 'ADMIN_ADJUSTMENT',
              amount: BigInt(amount),
              balanceAfter,
              description: 'Zmiana wykonana narzędziem konta testowego',
            },
          }),
        ]);
        message = `${amount >= 0 ? 'Dodano' : 'Odjęto'} ${Math.abs(amount).toLocaleString('pl-PL')} złota`;
        break;
      }
      case TestToolAction.ADD_EXPERIENCE:
        await this.charactersService.addExperience(character.id, Math.max(0, requiredValue(dto)));
        message = 'Dodano doświadczenie';
        break;
      case TestToolAction.SET_LEVEL: {
        const level = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, requiredValue(dto)));
        const allocated = [stats.strength, stats.agility, stats.endurance, stats.intelligence]
          .reduce((sum, value) => sum + Math.max(0, value - 5), 0);
        const unspentPoints = Math.max(0, (level - 1) * STAT_POINTS_PER_LEVEL - allocated);
        await this.prisma.$transaction([
          this.prisma.character.update({
            where: { id: character.id },
            data: { level, experience: 0, currentHp: null, healthUpdatedAt: new Date() },
          }),
          this.prisma.combatantStats.update({
            where: { combatantId: character.combatantId }, data: { unspentPoints },
          }),
        ]);
        message = `Ustawiono poziom ${level} i odnowiono zdrowie`;
        break;
      }
      case TestToolAction.SET_HEALTH_PERCENT: {
        const percent = Math.min(100, Math.max(1, requiredValue(dto)));
        const response = toCharacterResponse(character);
        await this.prisma.character.update({
          where: { id: character.id },
          data: { currentHp: Math.max(1, Math.ceil(response.maxHp * percent / 100)), healthUpdatedAt: new Date() },
        });
        message = `Ustawiono zdrowie na ${percent}%`;
        break;
      }
      case TestToolAction.SET_REPUTATION: {
        const reputation = Math.min(MAX_REPUTATION, Math.max(-MAX_REPUTATION, requiredValue(dto)));
        await this.prisma.character.update({ where: { id: character.id }, data: { reputation } });
        message = `Ustawiono reputację na ${reputation}`;
        break;
      }
      case TestToolAction.SET_LEARNING_POINTS: {
        const unspentPoints = Math.min(100_000, Math.max(0, requiredValue(dto)));
        await this.prisma.combatantStats.update({
          where: { combatantId: character.combatantId }, data: { unspentPoints },
        });
        message = `Ustawiono ${unspentPoints} punktów nauki`;
        break;
      }
      case TestToolAction.SET_ARENA_RATING: {
        const arenaRating = Math.min(10_000, Math.max(0, requiredValue(dto)));
        await this.prisma.character.update({ where: { id: character.id }, data: { arenaRating } });
        message = `Ustawiono ranking areny na ${arenaRating}`;
        break;
      }
      case TestToolAction.MAX_EXPERTISE:
      case TestToolAction.RESET_EXPERTISE: {
        const maximum = dto.action === TestToolAction.MAX_EXPERTISE;
        const experience = maximum ? maxExpertiseExperience() : 0;
        const level = maximum ? MAX_WEAPON_EXPERTISE_LEVEL : 1;
        await this.prisma.$transaction(
          Object.values(WeaponType).map((weaponType) => this.prisma.combatantWeaponExpertise.upsert({
            where: { combatantId_weaponType: { combatantId: character.combatantId, weaponType } },
            create: { combatantId: character.combatantId, weaponType, experience, level },
            update: { experience, level },
          })),
        );
        message = maximum ? 'Wszystkie biegłości osiągnęły maksimum' : 'Zresetowano biegłości broni';
        break;
      }
      case TestToolAction.ADD_ALL_GEMS: {
        const quantity = Math.min(1000, Math.max(1, requiredValue(dto)));
        const definitions = await this.prisma.gemDefinition.findMany({ select: { id: true } });
        await this.prisma.$transaction(definitions.map(({ id }) => this.prisma.gemStack.upsert({
          where: { combatantId_gemDefinitionId: { combatantId: character.combatantId, gemDefinitionId: id } },
          create: { combatantId: character.combatantId, gemDefinitionId: id, quantity },
          update: { quantity: { increment: quantity } },
        })));
        message = `Dodano po ${quantity} szt. każdego klejnotu`;
        break;
      }
      case TestToolAction.GUARANTEE_LEGENDARY_MISSION:
        await this.prisma.missionProgress.upsert({
          where: { characterId: character.id },
          create: { characterId: character.id, missionsSinceTierFive: 9 },
          update: { missionsSinceTierFive: 9 },
        });
        message = 'Następna wyprawa będzie legendarna';
        break;
      case TestToolAction.RESET_LIMITS:
        await Promise.all([
          this.redis.del(`${ATTACK_COOLDOWN_PREFIX}${character.combatantId}`),
          this.prisma.property.updateMany({ where: { characterId: character.id }, data: { lastRestoredAt: null } }),
        ]);
        message = 'Zresetowano blokadę areny i rytuału';
        break;
      case TestToolAction.REROLL_TAVERN_OFFERS:
        await this.tavernService.rerollBoardForTesting(userId);
        message = 'Wylosowano nowe zlecenia w Karczmie';
        break;
      case TestToolAction.RESET_TAVERN_QUEST: {
        const run = await this.prisma.tavernQuestRun.findFirst({
          where: { characterId: character.id },
          orderBy: { startedAt: 'desc' },
          include: { provisions: true },
        });
        if (!run) throw new BadRequestException('Brak misji karczmy do zresetowania');
        const health = toCharacterResponse(character);
        await this.prisma.$transaction([
          this.prisma.tavernQuestDecision.deleteMany({ where: { runId: run.id } }),
          this.prisma.tavernQuestEncounter.deleteMany({ where: { runId: run.id } }),
          this.prisma.tavernQuestPuzzle.deleteMany({ where: { runId: run.id } }),
        ...run.provisions.map((provision) => this.prisma.tavernQuestProvision.update({
          where: {
            runId_type: {
              runId: provision.runId,
              type: provision.type,
            },
          },
          data: {
            remaining: provision.initialQuantity,
            used: 0,
          },
        })),
          this.prisma.tavernQuestRun.update({
            where: { id: run.id },
            data: {
              stageIndex: 0,
              score: 0,
              status: 'ACTIVE',
              result: null,
              goldReward: 0n,
              experienceReward: 0n,
              reputationChange: 0,
              hpLost: 0,
              startingHp: health.currentHp,
              journeyHp: health.currentHp,
              maxHpSnapshot: health.maxHp,
              rewardItemId: null,
              rewardGemDefinitionId: null,
              storyRelicItemId: null,
              storyRelicAwarded: false,
              endingTitle: null,
              endingText: null,
              endingKey: null,
              resolvedAt: null,
              claimedAt: null,
            },
          }),
        ]);
        message = `Zresetowano misję „${run.title}” do pierwszego etapu`;
        break;
      }
      default:
        throw new BadRequestException('Nieobsługiwana operacja testowa');
    }

    return {
      message,
      character: toCharacterResponse(await this.charactersService.getById(character.id)),
    };
  }
}
