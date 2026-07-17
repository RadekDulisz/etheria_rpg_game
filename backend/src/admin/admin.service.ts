import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemCategory, ItemGrade, ItemRarity, Prisma, WeaponType } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { CreateBotDto, UpdateBotDto } from './dto/admin-bots.dto';
import { CreateItemDto, UpdateItemDto } from './dto/admin-items.dto';

export interface AdminItemResponse {
  id: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  rarity: ItemRarity;
  grade: ItemGrade;
  slotGroup: string | null;
  weaponType: WeaponType | null;
  maxStack: number;
  price: number;
  iconUrl: string | null;
  minLevel: number;
  strengthBonus: number;
  agilityBonus: number;
  enduranceBonus: number;
  intelligenceBonus: number;
  attackPower: number;
  damageMin: number;
  damageMax: number;
  defensePower: number;
  parryBonus: number;
  maxHpBonus: number;
  criticalChanceBonus: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBotResponse {
  id: string;
  combatantId: string;
  name: string;
  level: number;
  expReward: number;
  goldReward: number;
  isActive: boolean;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    parryRating: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BalanceAdjustmentResponse {
  characterId: string;
  characterName: string;
  amount: string;
  balanceAfter: string;
  referenceId: string;
  description: string | null;
  createdAt: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async listItems(): Promise<AdminItemResponse[]> {
    const items = await this.prisma.item.findMany({ orderBy: { name: 'asc' } });
    return items.map((item) => this.toItemResponse(item));
  }

  async createItem(dto: CreateItemDto): Promise<AdminItemResponse> {
    this.assertItemShape(dto.category, dto.slotGroup ?? null, dto.weaponType ?? null);

    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        rarity: dto.rarity ?? ItemRarity.COMMON,
        grade: dto.grade ?? gradeForLevel(dto.minLevel ?? 1),
        slotGroup: dto.slotGroup ?? null,
        weaponType: dto.weaponType ?? null,
        maxStack: dto.maxStack ?? 1,
        price: dto.price ?? 0,
        iconUrl: dto.iconUrl ?? null,
        minLevel: dto.minLevel ?? 1,
        strengthBonus: dto.strengthBonus ?? 0,
        agilityBonus: dto.agilityBonus ?? 0,
        enduranceBonus: dto.enduranceBonus ?? 0,
        intelligenceBonus: dto.intelligenceBonus ?? 0,
        attackPower: dto.attackPower ?? 0,
        damageMin: dto.damageMin ?? dto.attackPower ?? 0,
        damageMax: dto.damageMax ?? dto.attackPower ?? 0,
        defensePower: dto.defensePower ?? 0,
        parryBonus: dto.parryBonus ?? 0,
        maxHpBonus: dto.maxHpBonus ?? 0,
        criticalChanceBonus: dto.criticalChanceBonus ?? 0,
      },
    });

    return this.toItemResponse(item);
  }

  async updateItem(itemId: string, dto: UpdateItemDto): Promise<AdminItemResponse> {
    const existing = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!existing) {
      throw new NotFoundException('Przedmiot nie istnieje');
    }

    const nextCategory = dto.category ?? existing.category;
    const nextSlotGroup = dto.slotGroup === undefined ? existing.slotGroup : dto.slotGroup;
    const nextWeaponType = dto.weaponType === undefined ? existing.weaponType : dto.weaponType;
    this.assertItemShape(nextCategory, nextSlotGroup, nextWeaponType);

    const item = await this.prisma.item.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.rarity !== undefined ? { rarity: dto.rarity } : {}),
        ...(dto.grade !== undefined
          ? { grade: dto.grade }
          : dto.minLevel !== undefined
            ? { grade: gradeForLevel(dto.minLevel) }
            : {}),
        ...(dto.slotGroup !== undefined ? { slotGroup: dto.slotGroup } : {}),
        ...(dto.weaponType !== undefined ? { weaponType: dto.weaponType } : {}),
        ...(dto.maxStack !== undefined ? { maxStack: dto.maxStack } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.iconUrl !== undefined ? { iconUrl: dto.iconUrl } : {}),
        ...(dto.minLevel !== undefined ? { minLevel: dto.minLevel } : {}),
        ...(dto.strengthBonus !== undefined ? { strengthBonus: dto.strengthBonus } : {}),
        ...(dto.agilityBonus !== undefined ? { agilityBonus: dto.agilityBonus } : {}),
        ...(dto.enduranceBonus !== undefined ? { enduranceBonus: dto.enduranceBonus } : {}),
        ...(dto.intelligenceBonus !== undefined
          ? { intelligenceBonus: dto.intelligenceBonus }
          : {}),
        ...(dto.attackPower !== undefined ? { attackPower: dto.attackPower } : {}),
        ...(dto.damageMin !== undefined ? { damageMin: dto.damageMin } : {}),
        ...(dto.damageMax !== undefined ? { damageMax: dto.damageMax } : {}),
        ...(dto.defensePower !== undefined ? { defensePower: dto.defensePower } : {}),
        ...(dto.parryBonus !== undefined ? { parryBonus: dto.parryBonus } : {}),
        ...(dto.maxHpBonus !== undefined ? { maxHpBonus: dto.maxHpBonus } : {}),
        ...(dto.criticalChanceBonus !== undefined
          ? { criticalChanceBonus: dto.criticalChanceBonus }
          : {}),
      },
    });

    return this.toItemResponse(item);
  }

  async deleteItem(itemId: string): Promise<void> {
    try {
      await this.prisma.item.delete({ where: { id: itemId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Przedmiot jest już używany i nie można go usunąć');
      }
      throw error;
    }
  }

  async listBots(): Promise<AdminBotResponse[]> {
    const bots = await this.prisma.bot.findMany({
      orderBy: { name: 'asc' },
      include: { combatant: { include: { stats: true } } },
    });

    return bots.map((bot) => this.toBotResponse(bot));
  }

  async createBot(dto: CreateBotDto): Promise<AdminBotResponse> {
    const stats = this.normalizeBotStats(dto);

    const bot = await this.prisma.$transaction(async (tx) => {
      const combatant = await tx.combatant.create({ data: { type: 'BOT' } });
      await tx.combatantStats.create({
        data: {
          combatantId: combatant.id,
          strength: stats.strength,
          agility: stats.agility,
          endurance: stats.endurance,
          intelligence: stats.intelligence,
          parryRating: stats.parryRating,
        },
      });

      return tx.bot.create({
        data: {
          combatantId: combatant.id,
          name: dto.name,
          level: dto.level ?? 1,
          expReward: dto.expReward ?? 0,
          goldReward: dto.goldReward ?? 0,
          isActive: dto.isActive ?? true,
        },
        include: { combatant: { include: { stats: true } } },
      });
    });

    return this.toBotResponse(bot);
  }

  async updateBot(botId: string, dto: UpdateBotDto): Promise<AdminBotResponse> {
    const existing = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: { combatant: { include: { stats: true } } },
    });
    if (!existing || !existing.combatant.stats) {
      throw new NotFoundException('Bot nie istnieje');
    }

    const stats = this.normalizeBotStats(dto, existing.combatant.stats);

    const bot = await this.prisma.$transaction(async (tx) => {
      const updatedBot = await tx.bot.update({
        where: { id: botId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.level !== undefined ? { level: dto.level } : {}),
          ...(dto.expReward !== undefined ? { expReward: dto.expReward } : {}),
          ...(dto.goldReward !== undefined ? { goldReward: dto.goldReward } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { combatant: { include: { stats: true } } },
      });

      await tx.combatantStats.update({
        where: { combatantId: existing.combatantId },
        data: {
          strength: stats.strength,
          agility: stats.agility,
          endurance: stats.endurance,
          intelligence: stats.intelligence,
          parryRating: stats.parryRating,
        },
      });

      return updatedBot;
    });

    return this.toBotResponse(bot);
  }

  async deleteBot(botId: string): Promise<void> {
    const existing = await this.prisma.bot.findUnique({ where: { id: botId } });
    if (!existing) {
      throw new NotFoundException('Bot nie istnieje');
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: { isActive: false },
    });
  }

  async adjustCharacterBalance(
    userId: string,
    dto: AdjustBalanceDto,
  ): Promise<BalanceAdjustmentResponse> {
    const character = await this.charactersService.getById(userId);
    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }
    const nextGold = character.gold + BigInt(dto.amount);
    if (nextGold < 0n) {
      throw new BadRequestException('Korekta nie może zmniejszyć ilości złota poniżej zera');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: nextGold },
      });

      const transaction = await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'ADMIN_ADJUSTMENT',
          amount: BigInt(dto.amount),
          balanceAfter: nextGold,
          referenceId: character.id,
          description: dto.reason ?? 'Korekta balansu przez administratora',
        },
      });

      return { transaction, nextGold };
    });

    return {
      characterId: character.id,
      characterName: character.name,
      amount: BigInt(dto.amount).toString(),
      balanceAfter: updated.nextGold.toString(),
      referenceId: character.id,
      description: dto.reason ?? 'Korekta balansu przez administratora',
      createdAt: updated.transaction.createdAt.toISOString(),
    };
  }

  private assertItemShape(
    category: ItemCategory,
    slotGroup: string | null,
    weaponType: WeaponType | null,
  ): void {
    if (category === 'WEAPON') {
      if (!slotGroup || !weaponType) {
        throw new BadRequestException('Broń wymaga określenia miejsca wyposażenia i rodzaju broni');
      }
      return;
    }

    if (category === 'CONSUMABLE' && slotGroup !== null) {
      throw new BadRequestException('Przedmiot zużywalny nie może zajmować miejsca wyposażenia');
    }

    if (weaponType !== null) {
      throw new BadRequestException('Rodzaj broni można określić wyłącznie dla broni');
    }

    if (category !== 'CONSUMABLE' && !slotGroup) {
      throw new BadRequestException('Przedmiot, który nie jest zużywalny, wymaga określenia miejsca wyposażenia');
    }
  }

  private normalizeBotStats(
    dto: CreateBotDto | UpdateBotDto,
    fallback?: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      parryRating: number;
    },
  ) {
    return {
      strength: dto.strength ?? fallback?.strength ?? 5,
      agility: dto.agility ?? fallback?.agility ?? 5,
      endurance: dto.endurance ?? fallback?.endurance ?? 5,
      intelligence: dto.intelligence ?? fallback?.intelligence ?? 5,
      parryRating: dto.parryRating ?? fallback?.parryRating ?? 0,
    };
  }

  private toItemResponse(item: {
    id: string;
    name: string;
    description: string | null;
    category: ItemCategory;
    rarity: ItemRarity;
    grade: ItemGrade;
    slotGroup: string | null;
    weaponType: WeaponType | null;
    maxStack: number;
    price: number;
    iconUrl: string | null;
    minLevel: number;
    strengthBonus: number;
    agilityBonus: number;
    enduranceBonus: number;
    intelligenceBonus: number;
    attackPower: number;
    damageMin: number;
    damageMax: number;
    defensePower: number;
    parryBonus: number;
    maxHpBonus: number;
    criticalChanceBonus: number;
    createdAt: Date;
    updatedAt: Date;
  }): AdminItemResponse {
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toBotResponse(bot: {
    id: string;
    combatantId: string;
    name: string;
    level: number;
    expReward: number;
    goldReward: number;
    isActive: boolean;
    combatant: {
      stats: {
        strength: number;
        agility: number;
        endurance: number;
        intelligence: number;
        parryRating: number;
      } | null;
    };
    createdAt: Date;
    updatedAt: Date;
  }): AdminBotResponse {
    if (!bot.combatant.stats) {
      throw new NotFoundException('Bot nie ma statystyk');
    }

    return {
      id: bot.id,
      combatantId: bot.combatantId,
      name: bot.name,
      level: bot.level,
      expReward: bot.expReward,
      goldReward: bot.goldReward,
      isActive: bot.isActive,
      stats: {
        strength: bot.combatant.stats.strength,
        agility: bot.combatant.stats.agility,
        endurance: bot.combatant.stats.endurance,
        intelligence: bot.combatant.stats.intelligence,
        parryRating: bot.combatant.stats.parryRating,
      },
      createdAt: bot.createdAt.toISOString(),
      updatedAt: bot.updatedAt.toISOString(),
    };
  }
}

function gradeForLevel(level: number): ItemGrade {
  if (level >= 84) return ItemGrade.ANCIENT;
  if (level >= 80) return ItemGrade.RUNIC;
  if (level >= 76) return ItemGrade.S;
  if (level >= 61) return ItemGrade.A;
  if (level >= 52) return ItemGrade.B;
  if (level >= 40) return ItemGrade.C;
  if (level >= 20) return ItemGrade.D;
  return ItemGrade.NO_GRADE;
}
