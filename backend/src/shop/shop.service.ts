import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Item, ItemGrade, ItemRarity, Prisma } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { initialSocketState } from '../blacksmith/blacksmith.balance';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogQueryDto, CatalogSection } from './dto/catalog-query.dto';

// Po cztery oferty na kazda range. Gracz widzi swoja oraz nastepna range,
// czyli maksymalnie osiem dopasowanych pozycji zamiast wysokopoziomowych.
const DAILY_OFFERS_PER_GRADE = 4;
const DAILY_PAID_REFRESH_LIMIT = 3;
const gradeOrder = Object.values(ItemGrade);

const rarityRolls: Array<{ rarity: ItemRarity; threshold: number }> = [
  { rarity: ItemRarity.LEGENDARY, threshold: 0.5 },
  { rarity: ItemRarity.EPIC, threshold: 2.5 },
  { rarity: ItemRarity.RARE, threshold: 12 },
  { rarity: ItemRarity.UNCOMMON, threshold: 40 },
  { rarity: ItemRarity.COMMON, threshold: 100 },
];

const discountBuckets = [
  { threshold: 90, min: 5, max: 15 },
  { threshold: 99, min: 16, max: 25 },
  { threshold: 100, min: 25, max: 30 },
];

export function rollDailyDiscount(rng: () => number = Math.random): number {
  const bucketRoll = rng() * 100;
  const bucket = discountBuckets.find((entry) => bucketRoll < entry.threshold) ?? discountBuckets[0];
  return bucket.min + Math.floor(rng() * (bucket.max - bucket.min + 1));
}

export function visibleMarketGrades(level: number): ItemGrade[] {
  const current = gradeForLevel(level);
  const index = gradeOrder.indexOf(current);
  return gradeOrder.slice(index, index + 2);
}

export function marketRefreshCost(level: number, refreshesUsed: number): number {
  const baseCost = Math.max(50, level * 25);
  return baseCost * Math.min(3, refreshesUsed + 1);
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyOffers(): Promise<void> {
    await this.ensureTodayOffers();
  }

  /**
   * Idempotentne - jesli oferta na dzis juz istnieje, nic nie robi.
   * Wywolywane zarowno przez CRON (o polnocy), jak i "leniwie" przy
   * kazdym GET /shop/today - dzieki temu dziala tez lokalnie/w testach,
   * bez czekania na realna polnoc.
   */
  async ensureTodayOffers(): Promise<void> {
    const offerDate = todayDateOnly();
    const existingCount = await this.prisma.shopEntry.count({ where: { offerDate } });
    if (existingCount > 0) {
      return;
    }

    const allItems = await this.prisma.item.findMany({
      where: { category: { not: 'CONSUMABLE' }, price: { gt: 0 } },
    });
    if (allItems.length === 0) {
      return;
    }

    await this.prisma.shopEntry.createMany({
      data: this.buildOfferData(allItems, offerDate),
    });
  }

  async getTodayOffers(userId: string) {
    await this.ensureTodayOffers();

    const character = await this.charactersService.getByUserId(userId);
    const offerDate = todayDateOnly();
    const grades = visibleMarketGrades(character.level);

    const personalRefresh = await this.prisma.marketRefresh.findUnique({
      where: { characterId_offerDate: { characterId: character.id, offerDate } },
      select: { id: true },
    });
    const entries = await this.prisma.shopEntry.findMany({
      where: {
        offerDate,
        marketRefreshId: personalRefresh?.id ?? null,
        item: { grade: { in: grades }, price: { gt: 0 } },
      },
      include: { item: true },
    });

    // Widocznosc/blokada wg poziomu postaci (Item.minLevel vs Character.level) -
    // patrz docs/erd-06-transaction-shop.md.
    return entries.map((entry) => ({
      ...entry,
      locked: entry.item.minLevel > character.level,
    }));
  }

  async getRefreshStatus(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const offerDate = todayDateOnly();
    const state = await this.prisma.marketRefresh.findUnique({
      where: { characterId_offerDate: { characterId: character.id, offerDate } },
      select: { refreshCount: true },
    });
    const refreshesUsed = state?.refreshCount ?? 0;
    return {
      refreshesUsed,
      refreshesRemaining: Math.max(0, DAILY_PAID_REFRESH_LIMIT - refreshesUsed),
      nextRefreshCost: refreshesUsed < DAILY_PAID_REFRESH_LIMIT
        ? marketRefreshCost(character.level, refreshesUsed)
        : null,
    };
  }

  async refreshMarket(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const offerDate = todayDateOnly();
    const state = await this.prisma.marketRefresh.findUnique({
      where: { characterId_offerDate: { characterId: character.id, offerDate } },
    });
    const refreshesUsed = state?.refreshCount ?? 0;
    if (refreshesUsed >= DAILY_PAID_REFRESH_LIMIT) {
      throw new ConflictException('Wykorzystano już trzy odświeżenia targowiska na dziś');
    }

    const cost = marketRefreshCost(character.level, refreshesUsed);
    if (character.gold < BigInt(cost)) {
      throw new ConflictException('Masz za mało złota na odświeżenie oferty');
    }

    const allItems = await this.prisma.item.findMany({
      where: { category: { not: 'CONSUMABLE' }, price: { gt: 0 } },
    });
    if (!allItems.length) throw new NotFoundException('Brak przedmiotów do wylosowania');

    const newGold = character.gold - BigInt(cost);
    await this.prisma.$transaction(async (tx) => {
      const refresh = await tx.marketRefresh.upsert({
        where: { characterId_offerDate: { characterId: character.id, offerDate } },
        create: { characterId: character.id, offerDate, refreshCount: 1 },
        update: { refreshCount: { increment: 1 } },
      });
      await tx.shopEntry.deleteMany({ where: { marketRefreshId: refresh.id } });
      await tx.shopEntry.createMany({
        data: this.buildOfferData(allItems, offerDate, refresh.id),
      });
      await tx.character.update({ where: { id: character.id }, data: { gold: newGold } });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'MARKET_REFRESH',
          amount: -BigInt(cost),
          balanceAfter: newGold,
          referenceId: refresh.id,
          description: `Odświeżenie targowiska ${refreshesUsed + 1}/${DAILY_PAID_REFRESH_LIMIT}`,
        },
      });
    });

    return this.getRefreshStatus(userId);
  }

  async getCatalog(userId: string, query: CatalogQueryDto) {
    const character = await this.charactersService.getByUserId(userId);
    const where: Prisma.ItemWhereInput = {
      AND: [catalogWhere(query.section), { grade: query.grade }, { price: { gt: 0 } }],
    };
    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        orderBy: [{ minLevel: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      items: items.map((item) => ({ ...item, locked: item.minLevel > character.level })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getCatalogSummary() {
    const items = await this.prisma.item.findMany({
      where: { price: { gt: 0 } },
      select: { category: true, slotGroup: true, grade: true },
    });

    return Object.values(CatalogSection).map((section) => {
      const sectionItems = items.filter((item) => matchesCatalogSection(item, section));
      return {
        section,
        count: sectionItems.length,
        grades: Object.values(ItemGrade)
          .map((grade) => ({
            grade,
            count: sectionItems.filter((item) => item.grade === grade).length,
          }))
          .filter((entry) => entry.count > 0),
      };
    });
  }

  async purchase(userId: string, shopEntryId: string, quantity: number): Promise<void> {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;

    const entry = await this.prisma.shopEntry.findUnique({
      where: { id: shopEntryId },
      include: { item: true, marketRefresh: true },
    });
    if (!entry) {
      throw new NotFoundException('Oferta sklepu nie istnieje');
    }

    const today = todayDateOnly();
    if (entry.offerDate.getTime() !== today.getTime()) {
      throw new BadRequestException('Ta oferta nie jest już dostępna');
    }

    if (entry.marketRefresh && entry.marketRefresh.characterId !== character.id) {
      throw new NotFoundException('Oferta targowiska nie istnieje');
    }

    if (entry.stockLimit !== null && entry.quantitySold + quantity > entry.stockLimit) {
      throw new ConflictException('W dzisiejszej ofercie nie ma tylu sztuk');
    }

    const unitPrice = entry.priceOverride ?? entry.item.price;
    const totalPrice = BigInt(unitPrice * quantity);

    if (character.gold < totalPrice) {
      throw new ConflictException('Masz za mało złota');
    }

    const newGold = character.gold - totalPrice;

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold },
      });

      await tx.shopEntry.update({
        where: { id: entry.id },
        data: { quantitySold: { increment: quantity } },
      });

      for (let index = 0; index < quantity; index += 1) {
        await tx.ownedItem.create({
          data: {
            combatantId,
            itemId: entry.itemId,
            ...initialSocketState(entry.item),
          },
        });
      }

      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'SHOP_PURCHASE',
          amount: -totalPrice,
          balanceAfter: newGold,
          referenceId: entry.id,
          description: `Zakup: ${entry.item.name} x${quantity}`,
        },
      });
    });
  }

  async purchaseCatalogItem(userId: string, itemId: string, quantity: number): Promise<void> {
    const character = await this.charactersService.getByUserId(userId);
    const combatantId = character.combatantId;
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Przedmiot kupca nie istnieje');
    }
    const totalPrice = BigInt(item.price * quantity);
    if (character.gold < totalPrice) {
      throw new ConflictException('Masz za mało złota');
    }
    const newGold = character.gold - totalPrice;

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: newGold },
      });
      for (let index = 0; index < quantity; index += 1) {
        await tx.ownedItem.create({
          data: { combatantId, itemId, ...initialSocketState(item) },
        });
      }
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'SHOP_PURCHASE',
          amount: -totalPrice,
          balanceAfter: newGold,
          referenceId: item.id,
          description: `Zakup u kupca: ${item.name} x${quantity}`,
        },
      });
    });
  }

  private buildOfferData(
    allItems: Item[],
    offerDate: Date,
    marketRefreshId?: string,
    rng: () => number = Math.random,
  ): Prisma.ShopEntryCreateManyInput[] {
    const selected: Item[] = [];
    for (const grade of gradeOrder) {
      const available = allItems.filter((item) => item.grade === grade);
      while (available.length > 0 && selected.filter((item) => item.grade === grade).length < DAILY_OFFERS_PER_GRADE) {
        const rarityRoll = rng() * 100;
        const desiredRarity = rarityRolls.find((entry) => rarityRoll < entry.threshold)?.rarity;
        const matching = available.filter((item) => item.rarity === desiredRarity);
        const pool = matching.length ? matching : available;
        const chosen = pool[Math.floor(rng() * pool.length)];
        selected.push(chosen);
        available.splice(available.findIndex((item) => item.id === chosen.id), 1);
      }
    }
    return selected.map((item) => {
      const discountPercent = rollDailyDiscount(rng);
      return {
        itemId: item.id,
        offerDate,
        marketRefreshId,
        discountPercent,
        priceOverride: Math.max(1, Math.round(item.price * (1 - discountPercent / 100))),
        stockLimit: item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.EPIC
          ? 1
          : item.rarity === ItemRarity.RARE ? 2 : null,
      };
    });
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

function catalogWhere(section: CatalogSection): Prisma.ItemWhereInput {
  switch (section) {
    case CatalogSection.WEAPONS:
      return { category: 'WEAPON' };
    case CatalogSection.ARMOR:
      return {
        OR: [
          { category: 'SHIELD_SIGIL' },
          { category: 'ARMOR', NOT: { slotGroup: 'CLOAK' } },
        ],
      };
    case CatalogSection.JEWELRY:
      return { category: 'ACCESSORY' };
    case CatalogSection.SPECIAL:
      return { OR: [{ category: 'SPECIAL' }, { slotGroup: 'CLOAK' }] };
    default:
      return { id: { equals: '__unknown_catalog_section__' } };
  }
}

function matchesCatalogSection(
  item: { category: string; slotGroup: string | null },
  section: CatalogSection,
): boolean {
  switch (section) {
    case CatalogSection.WEAPONS:
      return item.category === 'WEAPON';
    case CatalogSection.ARMOR:
      return (
        item.category === 'SHIELD_SIGIL' ||
        (item.category === 'ARMOR' && item.slotGroup !== 'CLOAK')
      );
    case CatalogSection.JEWELRY:
      return item.category === 'ACCESSORY';
    case CatalogSection.SPECIAL:
      return item.category === 'SPECIAL' || item.slotGroup === 'CLOAK';
  }
}
