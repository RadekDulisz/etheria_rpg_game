import { ConflictException, Injectable } from '@nestjs/common';
import { MissionMorality } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { toCharacterResponse } from '../characters/characters.mapper';
import { applyExperienceGain } from '../characters/leveling';
import { getReputationRankDetails } from '../characters/reputation';
import { PrismaService } from '../prisma/prisma.service';
import { MISSION_TIERS, missionRanges, randomInteger, rollMissionTier, rollReputationChange } from './mission-balance';
import { MISSION_TEMPLATES } from './mission-templates';
import { MISSION_MORAL_ROUTES } from './mission-morality';
import { calculatePropertyBonuses } from '../properties/property-bonuses';

const SUCCESS_CHANCE = 0.7;
const ITEM_REWARD_CHANCE = 0.05;
const HISTORY_LIMIT = 6;

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getOverview(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const [progress, history] = await Promise.all([
      this.prisma.missionProgress.findUnique({ where: { characterId: character.id } }),
      this.prisma.missionAttempt.findMany({
        where: { characterId: character.id },
        include: { rewardItem: true },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      }),
    ]);
    const response = toCharacterResponse(character);
    const propertyBonuses = calculatePropertyBonuses(character.property?.level, character.reputation);

    return {
      successChance: Math.round((SUCCESS_CHANCE + propertyBonuses.missionSuccessBonus) * 1000) / 10,
      itemRewardChance: Math.round((ITEM_REWARD_CHANCE + propertyBonuses.itemRewardChanceBonus) * 1000) / 10,
      totalMissions: progress?.totalMissions ?? 0,
      missionsUntilGuaranteedTierFive: Math.max(1, 10 - (progress?.missionsSinceTierFive ?? 0)),
      health: { current: response.currentHp, max: response.maxHp },
      tiers: MISSION_TIERS.map((tier) => ({ ...tier, ...missionRanges(tier, character.level) })),
      history: history.map(serializeAttempt),
    };
  }

  async embark(userId: string, morality: MissionMorality) {
    const character = await this.charactersService.getByUserId(userId);
    const progress = await this.prisma.missionProgress.findUnique({
      where: { characterId: character.id },
    });
    const tier = rollMissionTier(Math.random(), progress?.missionsSinceTierFive ?? 0);
    const templates = MISSION_TEMPLATES[tier.tier];
    const template = templates[randomInteger(0, templates.length - 1)];
    const moralRoute = MISSION_MORAL_ROUTES[tier.tier][morality];
    const propertyBonuses = calculatePropertyBonuses(character.property?.level, character.reputation);
    const success = Math.random() < SUCCESS_CHANCE + propertyBonuses.missionSuccessBonus;
    const ranges = missionRanges(tier, character.level);
    const characterResponse = toCharacterResponse(character);
    const minimumSafeHp = Math.floor(characterResponse.maxHp * 0.5) + 1;
    if (characterResponse.currentHp < minimumSafeHp) {
      throw new ConflictException('Bohater jest zbyt ranny. Wyprawa wymaga więcej niż 50% HP');
    }
    const hpPercent = randomInteger(ranges.hpPercentMin, ranges.hpPercentMax);
    const rolledHpLoss = Math.max(1, Math.ceil(characterResponse.maxHp * hpPercent / 100));
    const hpLost = Math.min(Math.max(0, characterResponse.currentHp - 1), rolledHpLoss);
    const currentHp = Math.max(1, characterResponse.currentHp - hpLost);
    const goldReward = success
      ? Math.round(randomInteger(ranges.goldMin, ranges.goldMax) * propertyBonuses.missionGoldMultiplier)
      : 0;
    const experienceReward = success
      ? randomInteger(ranges.experienceMin, ranges.experienceMax)
      : 0;
    const reputationChange = rollReputationChange(morality);
    const reputationAfter = character.reputation + reputationChange;

    let rewardItem = null;
    if (success && Math.random() < ITEM_REWARD_CHANCE + propertyBonuses.itemRewardChanceBonus) {
      const where = { minLevel: { lte: character.level }, category: { not: 'CONSUMABLE' as const } };
      const count = await this.prisma.item.count({ where });
      if (count > 0) {
        rewardItem = await this.prisma.item.findFirst({
          where,
          orderBy: { id: 'asc' },
          skip: randomInteger(0, count - 1),
        });
      }
    }

    const levelProgress = applyExperienceGain(
      character.level,
      character.experience,
      BigInt(experienceReward),
    );
    const balanceAfter = character.gold + BigInt(goldReward);
    const now = new Date();

    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          gold: { increment: BigInt(goldReward) },
          level: levelProgress.level,
          experience: levelProgress.experience,
          currentHp,
          healthUpdatedAt: now,
          reputation: { increment: reputationChange },
        },
      });
      if (levelProgress.unspentPointsGained > 0) {
        await tx.combatantStats.update({
          where: { combatantId: character.combatantId },
          data: { unspentPoints: { increment: levelProgress.unspentPointsGained } },
        });
      }
      if (rewardItem) {
        await tx.inventoryItem.upsert({
          where: { combatantId_itemId: { combatantId: character.combatantId, itemId: rewardItem.id } },
          create: { combatantId: character.combatantId, itemId: rewardItem.id, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }

      const created = await tx.missionAttempt.create({
        data: {
          characterId: character.id,
          tier: tier.tier,
          title: template.title,
          description: template.description,
          outcomeText: `${success ? template.success : template.failure} ${success ? moralRoute.success : moralRoute.failure}`,
          result: success ? 'SUCCESS' : 'FAILURE',
          morality,
          choiceTitle: moralRoute.title,
          choiceDescription: moralRoute.description,
          reputationChange,
          goldReward: BigInt(goldReward),
          experienceReward: BigInt(experienceReward),
          hpLost,
          rewardItemId: rewardItem?.id,
        },
        include: { rewardItem: true },
      });
      await tx.missionProgress.upsert({
        where: { characterId: character.id },
        create: {
          characterId: character.id,
          totalMissions: 1,
          missionsSinceTierFive: tier.tier === 5 ? 0 : 1,
        },
        update: {
          totalMissions: { increment: 1 },
          missionsSinceTierFive: tier.tier === 5 ? 0 : { increment: 1 },
        },
      });
      if (goldReward > 0) {
        await tx.transaction.create({
          data: {
            characterId: character.id,
            type: 'QUEST_REWARD',
            amount: BigInt(goldReward),
            balanceAfter,
            referenceId: created.id,
            description: `Nagroda za wyprawę: ${template.title}`,
          },
        });
      }
      return created;
    });

    return {
      ...serializeAttempt(attempt),
      health: { current: currentHp, max: characterResponse.maxHp },
      level: levelProgress.level,
      balanceAfter: balanceAfter.toString(),
      reputationAfter,
      reputationRank: getReputationRankDetails(reputationAfter),
    };
  }
}

function serializeAttempt(attempt: {
  id: string;
  tier: number;
  title: string;
  description: string;
  outcomeText: string;
  result: 'SUCCESS' | 'FAILURE';
  goldReward: bigint;
  experienceReward: bigint;
  hpLost: number;
  morality: 'GOOD' | 'EVIL' | null;
  choiceTitle: string | null;
  choiceDescription: string | null;
  reputationChange: number;
  rewardItem: unknown;
  createdAt: Date;
}) {
  return {
    ...attempt,
    goldReward: attempt.goldReward.toString(),
    experienceReward: attempt.experienceReward.toString(),
  };
}
