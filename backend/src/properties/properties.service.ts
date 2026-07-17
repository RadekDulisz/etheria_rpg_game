import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuyPropertyDto } from './dto/buy-property.dto';
import { toCharacterResponse, CharacterWithStats } from '../characters/characters.mapper';
import { calculatePropertyBonuses, calculateRestorationGoldCost } from './property-bonuses';

const PROPERTY_PURCHASE_COST = 150n;
const PROPERTY_BASE_INCOME = 100;
const PROPERTY_INCOME_PER_LEVEL = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const RESTORATION_COOLDOWN_MS = 30 * 60 * 1000;
const PROPERTY_LEVELS = [
  { level: 1, requiredLevel: 1, upgradeCost: 0, element: 'Opuszczone domostwo i palenisko' },
  { level: 2, requiredLevel: 5, upgradeCost: 300, element: 'Odbudowany dach' },
  { level: 3, requiredLevel: 10, upgradeCost: 525, element: 'Studnia i ogród zielarski' },
  { level: 4, requiredLevel: 15, upgradeCost: 919, element: 'Kapliczka lub miejsce rytuału' },
  { level: 5, requiredLevel: 20, upgradeCost: 1608, element: 'Palisada i brama' },
  { level: 6, requiredLevel: 30, upgradeCost: 2814, element: 'Warsztat i stajnia' },
  { level: 7, requiredLevel: 40, upgradeCost: 4925, element: 'Wieża strażnicza' },
  { level: 8, requiredLevel: 52, upgradeCost: 8619, element: 'Kamienny dwór' },
  { level: 9, requiredLevel: 61, upgradeCost: 15083, element: 'Wielka kaplica i biblioteka' },
  { level: 10, requiredLevel: 76, upgradeCost: 26395, element: 'Ufortyfikowana rezydencja' },
] as const;

export interface PropertyUpgradeResponse {
  id: string;
  fromLevel: number;
  toLevel: number;
  goldCost: number;
  incomeAfter: number;
  upgradedAt: string;
}

export interface PropertyResponse {
  id: string;
  characterId: string;
  name: string;
  description: string | null;
  level: number;
  baseIncome: number;
  dailyIncome: number;
  collectableIncome: number;
  nextUpgradeCost: string;
  purchaseCost: string;
  maxLevel: number;
  nextLevelRequiredCharacterLevel: number | null;
  currentElement: string;
  nextElement: string | null;
  health: { current: number; max: number };
  regeneration: { multiplier: number; percentPerFiveMinutes: number };
  restoration: {
    actionName: string;
    goldCost: string;
    healPercent: number;
    readyAt: string | null;
    secondsRemaining: number;
    available: boolean;
  };
  reputationBonus: {
    alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
    title: string;
    missionSuccessPercent: number;
    missionGoldPercent: number;
    itemChancePercent: number;
  };
  lastCollectedAt: string;
  createdAt: string;
  updatedAt: string;
  upgrades: PropertyUpgradeResponse[];
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async buyProperty(userId: string, dto: BuyPropertyDto): Promise<PropertyResponse> {
    const character = await this.charactersService.getByUserId(userId);
    const existing = await this.prisma.property.findUnique({
      where: { characterId: character.id },
    });
    if (existing) {
      throw new ConflictException('Masz już posiadłość');
    }

    if (character.gold < PROPERTY_PURCHASE_COST) {
      throw new ConflictException('Masz za mało złota na zakup posiadłości');
    }

    const newGold = character.gold - PROPERTY_PURCHASE_COST;

    const property = await this.prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          characterId: character.id,
          name: dto.name,
          description: dto.description ?? null,
          level: 1,
          baseIncome: PROPERTY_BASE_INCOME,
          lastCollectedAt: new Date(),
        },
        include: { upgrades: true },
      });

      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold },
      });

      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'PROPERTY_PURCHASE',
          amount: -PROPERTY_PURCHASE_COST,
          balanceAfter: newGold,
          referenceId: created.id,
          description: `Zakup posiadlosci: ${dto.name}`,
        },
      });

      return created;
    });

    return this.toResponse(property, 0, character);
  }

  async getMyProperty(userId: string): Promise<PropertyResponse | null> {
    const character = await this.charactersService.getByUserId(userId);
    const property = await this.prisma.property.findUnique({
      where: { characterId: character.id },
      include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
    });

    if (!property) {
      return null;
    }

    return this.toResponse(property, this.calculateCollectableIncome(property, new Date()), character);
  }

  async upgradeMyProperty(userId: string): Promise<PropertyResponse> {
    const character = await this.charactersService.getByUserId(userId);
    const property = await this.prisma.property.findUnique({
      where: { characterId: character.id },
      include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
    });

    if (!property) {
      throw new NotFoundException('Nie masz jeszcze posiadłości');
    }

    const nextLevel = property.level + 1;
    if (nextLevel > PROPERTY_LEVELS.length) {
      throw new ConflictException('Posiadłość osiągnęła najwyższy poziom rozbudowy');
    }
    const nextLevelConfig = PROPERTY_LEVELS[nextLevel - 1];
    if (character.level < nextLevelConfig.requiredLevel) {
      throw new ConflictException(
        `Poziom ${nextLevel} posiadłości wymaga ${nextLevelConfig.requiredLevel} poziomu bohatera`,
      );
    }
    const upgradeCost = BigInt(nextLevelConfig.upgradeCost);

    if (character.gold < upgradeCost) {
      throw new ConflictException('Masz za mało złota na rozbudowę posiadłości');
    }

    const newGold = character.gold - upgradeCost;
    const updatedProperty = await this.prisma.$transaction(async (tx) => {
      const next = await tx.property.update({
        where: { id: property.id },
        data: { level: nextLevel },
        include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
      });

      await tx.propertyUpgrade.create({
        data: {
          propertyId: property.id,
          fromLevel: property.level,
          toLevel: nextLevel,
          goldCost: Number(upgradeCost),
          incomeAfter: next.baseIncome * next.level,
        },
      });

      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold },
      });

      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'PROPERTY_UPGRADE',
          amount: -upgradeCost,
          balanceAfter: newGold,
          referenceId: property.id,
          description: `Rozbudowa posiadlosci: ${property.name} do poziomu ${nextLevel}`,
        },
      });

      return next;
    });

    return this.toResponse(
      updatedProperty,
      this.calculateCollectableIncome(updatedProperty, new Date()),
      character,
    );
  }

  async collectIncome(userId: string): Promise<PropertyResponse> {
    const character = await this.charactersService.getByUserId(userId);
    const property = await this.prisma.property.findUnique({
      where: { characterId: character.id },
      include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
    });

    if (!property) {
      throw new NotFoundException('Nie masz jeszcze posiadłości');
    }

    const now = new Date();
    const collectableIncome = this.calculateCollectableIncome(property, now);
    if (collectableIncome <= 0) {
      throw new BadRequestException('Nie masz jeszcze zgromadzonego dochodu do odebrania');
    }

    const nextCollectedAt = this.advanceCollectionDate(property.lastCollectedAt, now);
    const newGold = character.gold + BigInt(collectableIncome);

    const updatedProperty = await this.prisma.$transaction(async (tx) => {
      const next = await tx.property.update({
        where: { id: property.id },
        data: { lastCollectedAt: nextCollectedAt },
        include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
      });

      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold },
      });

      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'PROPERTY_INCOME',
          amount: BigInt(collectableIncome),
          balanceAfter: newGold,
          referenceId: property.id,
          description: `Pobranie dochodu z posiadlosci: ${property.name}`,
        },
      });

      return next;
    });

    return this.toResponse(updatedProperty, 0, { ...character, gold: newGold });
  }

  async restoreHealth(userId: string): Promise<PropertyResponse> {
    const character = await this.charactersService.getByUserId(userId);
    const property = await this.prisma.property.findUnique({
      where: { characterId: character.id },
      include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
    });
    if (!property) {
      throw new NotFoundException('Nie masz jeszcze posiadłości');
    }

    const now = new Date();
    const readyAt = property.lastRestoredAt
      ? new Date(property.lastRestoredAt.getTime() + RESTORATION_COOLDOWN_MS)
      : null;
    if (readyAt && readyAt > now) {
      const minutes = Math.ceil((readyAt.getTime() - now.getTime()) / 60_000);
      throw new ConflictException(`Miejsce odnowy będzie gotowe za ${minutes} min`);
    }

    const characterResponse = toCharacterResponse(character);
    if (characterResponse.currentHp >= characterResponse.maxHp) {
      throw new BadRequestException('Bohater ma już pełne zdrowie');
    }
    const bonuses = calculatePropertyBonuses(property.level, character.reputation);
    const healPercent = Math.min(40, 10 + property.level * 2 + bonuses.restorationPercentBonus);
    const restoredHp = Math.max(1, Math.ceil(characterResponse.maxHp * healPercent / 100));
    const currentHp = Math.min(characterResponse.maxHp, characterResponse.currentHp + restoredHp);
    const goldCost = BigInt(calculateRestorationGoldCost(character.level, property.level));
    if (character.gold < goldCost) {
      throw new ConflictException('Masz za mało złota na odnowienie zdrowia');
    }
    const newGold = character.gold - goldCost;

    const updatedProperty = await this.prisma.$transaction(async (tx) => {
      const next = await tx.property.update({
        where: { id: property.id },
        data: { lastRestoredAt: now },
        include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
      });
      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold, currentHp, healthUpdatedAt: now },
      });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'PROPERTY_RESTORATION',
          amount: -goldCost,
          balanceAfter: newGold,
          referenceId: property.id,
          description: `Odnowienie zdrowia w posiadłości: ${property.name}`,
        },
      });
      return next;
    });

    return this.toResponse(updatedProperty, this.calculateCollectableIncome(updatedProperty, now), {
      ...character,
      gold: newGold,
      currentHp,
      healthUpdatedAt: now,
    });
  }

  async listPropertyUpgrades(userId: string): Promise<PropertyUpgradeResponse[]> {
    const character = await this.charactersService.getByUserId(userId);
    const property = await this.prisma.property.findUnique({
      where: { characterId: character.id },
      include: { upgrades: { orderBy: { upgradedAt: 'asc' } } },
    });

    if (!property) {
      throw new NotFoundException('Nie masz jeszcze posiadłości');
    }

    return property.upgrades.map((upgrade) => ({
      id: upgrade.id,
      fromLevel: upgrade.fromLevel,
      toLevel: upgrade.toLevel,
      goldCost: upgrade.goldCost,
      incomeAfter: upgrade.incomeAfter,
      upgradedAt: upgrade.upgradedAt.toISOString(),
    }));
  }

  private calculateDailyIncome(property: { baseIncome: number; level: number }): number {
    return property.baseIncome + (property.level - 1) * PROPERTY_INCOME_PER_LEVEL;
  }

  private calculateCollectableIncome(
    property: { baseIncome: number; level: number; lastCollectedAt: Date },
    now: Date,
  ): number {
    const elapsedMs = now.getTime() - property.lastCollectedAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);
    if (elapsedDays <= 0) {
      return 0;
    }

    return elapsedDays * this.calculateDailyIncome(property);
  }

  private advanceCollectionDate(previous: Date, now: Date): Date {
    const elapsedMs = now.getTime() - previous.getTime();
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);
    return new Date(previous.getTime() + elapsedDays * DAY_MS);
  }

  private toResponse(
    property: {
      id: string;
      characterId: string;
      name: string;
      description: string | null;
      level: number;
      baseIncome: number;
      lastCollectedAt: Date;
      lastRestoredAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      upgrades: Array<{
        id: string;
        fromLevel: number;
        toLevel: number;
        goldCost: number;
        incomeAfter: number;
        upgradedAt: Date;
      }>;
    },
    collectableIncome: number,
    character: CharacterWithStats,
  ): PropertyResponse {
    const levelConfig = PROPERTY_LEVELS[Math.min(property.level, PROPERTY_LEVELS.length) - 1];
    const nextLevelConfig = PROPERTY_LEVELS[property.level] ?? null;
    const bonuses = calculatePropertyBonuses(property.level, character.reputation);
    const characterResponse = toCharacterResponse(character);
    const now = new Date();
    const readyAt = property.lastRestoredAt
      ? new Date(property.lastRestoredAt.getTime() + RESTORATION_COOLDOWN_MS)
      : null;
    const secondsRemaining = readyAt
      ? Math.max(0, Math.ceil((readyAt.getTime() - now.getTime()) / 1000))
      : 0;
    const restorationPercent = Math.round(
      Math.min(40, 10 + property.level * 2 + bonuses.restorationPercentBonus) * 10,
    ) / 10;
    const restorationCost = calculateRestorationGoldCost(character.level, property.level);
    const reputationTitle = bonuses.alignment === 'GOOD'
      ? 'Łaska domostwa'
      : bonuses.alignment === 'EVIL'
        ? 'Haracz i sieć szpiegów'
        : 'Spokojne schronienie';
    return {
      id: property.id,
      characterId: property.characterId,
      name: property.name,
      description: property.description,
      level: property.level,
      baseIncome: property.baseIncome,
      dailyIncome: this.calculateDailyIncome(property),
      collectableIncome,
      nextUpgradeCost: nextLevelConfig ? nextLevelConfig.upgradeCost.toString() : '0',
      purchaseCost: PROPERTY_PURCHASE_COST.toString(),
      maxLevel: PROPERTY_LEVELS.length,
      nextLevelRequiredCharacterLevel: nextLevelConfig?.requiredLevel ?? null,
      currentElement: levelConfig.element,
      nextElement: nextLevelConfig?.element ?? null,
      health: { current: characterResponse.currentHp, max: characterResponse.maxHp },
      regeneration: {
        multiplier: Math.round(bonuses.regenMultiplier * 100) / 100,
        percentPerFiveMinutes: Math.round(5 * bonuses.regenMultiplier * 10) / 10,
      },
      restoration: {
        actionName: bonuses.alignment === 'GOOD'
          ? 'Pomódl się o łaskę'
          : bonuses.alignment === 'EVIL'
            ? 'Dopełnij mrocznego rytuału'
            : 'Odpocznij przy palenisku',
        goldCost: restorationCost.toString(),
        healPercent: restorationPercent,
        readyAt: readyAt?.toISOString() ?? null,
        secondsRemaining,
        available: secondsRemaining === 0 && characterResponse.currentHp < characterResponse.maxHp,
      },
      reputationBonus: {
        alignment: bonuses.alignment,
        title: reputationTitle,
        missionSuccessPercent: Math.round(bonuses.missionSuccessBonus * 1000) / 10,
        missionGoldPercent: Math.round((bonuses.missionGoldMultiplier - 1) * 1000) / 10,
        itemChancePercent: Math.round(bonuses.itemRewardChanceBonus * 1000) / 10,
      },
      lastCollectedAt: property.lastCollectedAt.toISOString(),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
      upgrades: property.upgrades.map((upgrade) => ({
        id: upgrade.id,
        fromLevel: upgrade.fromLevel,
        toLevel: upgrade.toLevel,
        goldCost: upgrade.goldCost,
        incomeAfter: upgrade.incomeAfter,
        upgradedAt: upgrade.upgradedAt.toISOString(),
      })),
    };
  }
}
