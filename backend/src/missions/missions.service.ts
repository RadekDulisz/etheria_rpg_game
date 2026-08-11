import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GemTier, MissionMorality } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { toCharacterResponse } from '../characters/characters.mapper';
import { applyExperienceGain } from '../characters/leveling';
import { getReputationRankDetails } from '../characters/reputation';
import { PrismaService } from '../prisma/prisma.service';
import { MISSION_TIERS, missionRanges, randomInteger, rollMissionTier, rollReputationChange } from './mission-balance';
import { MISSION_TEMPLATES } from './mission-templates';
import { MISSION_MORAL_ROUTES } from './mission-morality';
import { calculatePropertyBonuses } from '../properties/property-bonuses';
import { calculateMaxHp } from '../combat/combat-formulas';
import { initialSocketState, resolveOwnedItemStats } from '../blacksmith/blacksmith.balance';

const SUCCESS_CHANCE = 0.7;
const HISTORY_LIMIT = 6;
const GEM_DROP_CHANCE_BY_TIER = [0.08, 0.12, 0.16, 0.21, 0.28] as const;
const GEM_TIERS_BY_MISSION: GemTier[][] = [
  [GemTier.SHARD],
  [GemTier.SHARD, GemTier.CUT],
  [GemTier.SHARD, GemTier.CUT, GemTier.FLAWLESS],
  [GemTier.CUT, GemTier.FLAWLESS, GemTier.ROYAL],
  [GemTier.FLAWLESS, GemTier.ROYAL, GemTier.ANCIENT],
];

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
        include: { rewardItem: true, rewardGemDefinition: true },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      }),
    ]);
    const response = toCharacterResponse(character);
    const propertyBonuses = calculatePropertyBonuses(character.property?.level, character.reputation);
    const propertyBonusSummary = {
      level: character.property?.level ?? 0,
      successPercent: Math.round(propertyBonuses.missionSuccessBonus * 1000) / 10,
      goldPercent: Math.round((propertyBonuses.missionGoldMultiplier - 1) * 1000) / 10,
      itemChancePercent: Math.round(propertyBonuses.itemRewardChanceBonus * 1000) / 10,
    };

    return {
      successChance: Math.round((SUCCESS_CHANCE + propertyBonuses.missionSuccessBonus) * 1000) / 10,
      itemRewardChance: Math.round(
        (MISSION_TIERS[0].itemChance / 100 + propertyBonuses.itemRewardChanceBonus) * 1000,
      ) / 10,
      totalMissions: progress?.totalMissions ?? 0,
      missionsUntilGuaranteedTierFive: Math.max(1, 10 - (progress?.missionsSinceTierFive ?? 0)),
      health: { current: response.currentHp, max: response.maxHp },
      propertyBonus: propertyBonusSummary,
      tiers: MISSION_TIERS.map((tier) => {
        const ranges = missionRanges(tier, character.level);
        return {
          ...tier,
          ...ranges,
          goldMin: Math.round(ranges.goldMin * propertyBonuses.missionGoldMultiplier),
          goldMax: Math.round(ranges.goldMax * propertyBonuses.missionGoldMultiplier),
          itemRewardChance: Math.round(
            (tier.itemChance / 100 + propertyBonuses.itemRewardChanceBonus) * 1000,
          ) / 10,
        };
      }),
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
    let rewardGemDefinition = null;
    if (
      success
      && Math.random() < tier.itemChance / 100 + propertyBonuses.itemRewardChanceBonus
    ) {
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

    if (success && Math.random() < GEM_DROP_CHANCE_BY_TIER[tier.tier - 1]) {
      const eligibleGemTiers = GEM_TIERS_BY_MISSION[tier.tier - 1];
      const gems = await this.prisma.gemDefinition.findMany({
        where: { tier: { in: eligibleGemTiers }, minLevel: { lte: character.level } },
        orderBy: [{ minLevel: 'asc' }, { family: 'asc' }],
      });
      if (gems.length) {
        // Kwadrat losowania premiuje niższe jakości, nie odbierając szansy na rzadki kamień.
        const index = Math.floor(Math.pow(Math.random(), 2) * gems.length);
        rewardGemDefinition = gems[Math.min(index, gems.length - 1)];
      }
    }

    const levelProgress = applyExperienceGain(
      character.level,
      character.experience,
      BigInt(experienceReward),
    );
    const leveledUp = levelProgress.level > character.level;
    if (!character.combatant.stats) {
      throw new NotFoundException('Brak statystyk dla tej postaci');
    }
    const equippedItems = character.combatant.equippedItems ?? [];
    const enduranceAfterEquipment = character.combatant.stats.endurance
      + equippedItems.reduce(
        (total, equipped) => total + resolveOwnedItemStats(equipped.ownedItem).enduranceBonus,
        0,
      );
    const maxHpBonus = equippedItems.reduce(
      (total, equipped) => total + resolveOwnedItemStats(equipped.ownedItem).maxHpBonus,
      0,
    );
    const hpAfterMission = leveledUp
      ? calculateMaxHp(enduranceAfterEquipment, levelProgress.level, maxHpBonus)
      : currentHp;
    const balanceAfter = character.gold + BigInt(goldReward);
    const now = new Date();

    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          gold: { increment: BigInt(goldReward) },
          level: levelProgress.level,
          experience: levelProgress.experience,
          currentHp: hpAfterMission,
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
        await tx.ownedItem.create({
          data: {
            combatantId: character.combatantId,
            itemId: rewardItem.id,
            ...initialSocketState(rewardItem),
          },
        });
      }
      if (rewardGemDefinition) {
        await tx.gemStack.upsert({
          where: {
            combatantId_gemDefinitionId: {
              combatantId: character.combatantId,
              gemDefinitionId: rewardGemDefinition.id,
            },
          },
          create: {
            combatantId: character.combatantId,
            gemDefinitionId: rewardGemDefinition.id,
            quantity: 1,
          },
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
          rewardGemDefinitionId: rewardGemDefinition?.id,
        },
        include: { rewardItem: true, rewardGemDefinition: true },
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
  rewardGemDefinition: unknown;
  createdAt: Date;
}) {
  return {
    ...attempt,
    goldReward: attempt.goldReward.toString(),
    experienceReward: attempt.experienceReward.toString(),
  };
}
