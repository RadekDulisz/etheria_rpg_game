import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterWithStats } from './characters.mapper';
import { applyExperienceGain } from './leveling';

interface StatAllocation {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
}

const CHARACTER_WITH_STATS_INCLUDE = {
  property: { select: { level: true } },
  combatant: {
    include: {
      stats: true,
      equippedItems: { include: { item: true } },
      weaponExpertise: true,
    },
  },
} as const;

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCharacter(userId: string, name: string): Promise<CharacterWithStats> {
    const existing = await this.prisma.character.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Masz już postać na tym koncie');
    }

    try {
      const characterId = await this.prisma.$transaction(async (tx) => {
        const combatant = await tx.combatant.create({ data: { type: 'PLAYER' } });
        const character = await tx.character.create({
          data: { userId, name, combatantId: combatant.id },
        });
        await tx.combatantStats.create({ data: { combatantId: combatant.id } });
        return character.id;
      });

      return this.getById(characterId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ta nazwa postaci jest już zajęta');
      }
      throw error;
    }
  }

  async getByUserId(userId: string): Promise<CharacterWithStats> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: CHARACTER_WITH_STATS_INCLUDE,
    });
    if (!character) {
      throw new NotFoundException('Nie masz jeszcze postaci');
    }
    return character;
  }

  async getById(characterId: string): Promise<CharacterWithStats> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: CHARACTER_WITH_STATS_INCLUDE,
    });
    if (!character) {
      throw new NotFoundException('Postać nie istnieje');
    }
    return character;
  }

  /**
   * Publiczne, ograniczone dane (bez statystyk/zlota) - do wyszukiwania
   * przeciwnika przed walka PvP (etap 7).
   */
  searchByName(query: string, limit = 10) {
    return this.prisma.character.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      select: { id: true, name: true, level: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async allocateStatPoints(
    userId: string,
    allocation: StatAllocation,
  ): Promise<CharacterWithStats> {
    const character = await this.getByUserId(userId);
    const stats = character.combatant.stats;
    if (!stats) {
      throw new NotFoundException('Brak statystyk dla tej postaci');
    }

    const totalRequested =
      allocation.strength + allocation.agility + allocation.endurance + allocation.intelligence;

    if (totalRequested > stats.unspentPoints) {
      throw new ConflictException('Nie masz tylu wolnych punktów atrybutów');
    }

    const allocationResult = await this.prisma.combatantStats.updateMany({
      where: { combatantId: character.combatantId, unspentPoints: { gte: totalRequested } },
      data: {
        strength: { increment: allocation.strength },
        agility: { increment: allocation.agility },
        endurance: { increment: allocation.endurance },
        intelligence: { increment: allocation.intelligence },
        unspentPoints: { decrement: totalRequested },
      },
    });
    if (allocationResult.count !== 1) {
      throw new ConflictException('Punkty nauki zostały już wykorzystane');
    }

    return this.getById(character.id);
  }

  /**
   * Dolicza punkty doswiadczenia i obsluguje (rowniez wielokrotny) awans
   * poziomu. Docelowo wywolywane wewnetrznie przez silnik walki (etap 6);
   * na razie dostepne przez endpoint admina do testow/balansu.
   */
  async addExperience(characterId: string, amount: number): Promise<CharacterWithStats> {
    const character = await this.getById(characterId);
    if (!character.combatant.stats) {
      throw new NotFoundException('Brak statystyk dla tej postaci');
    }

    const progress = applyExperienceGain(character.level, character.experience, BigInt(amount));

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: characterId },
        data: { level: progress.level, experience: progress.experience },
      });

      if (progress.unspentPointsGained > 0) {
        await tx.combatantStats.update({
          where: { combatantId: character.combatantId },
          data: { unspentPoints: { increment: progress.unspentPointsGained } },
        });
      }
    });

    return this.getById(characterId);
  }
}
