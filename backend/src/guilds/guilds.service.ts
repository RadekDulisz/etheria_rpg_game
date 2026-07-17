import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuildDto } from './dto/create-guild.dto';

const MAX_GUILD_MEMBERS = 20;

export interface GuildMemberResponse {
  characterId: string;
  characterName: string;
  level: number;
  role: string;
  joinedAt: string;
}

export interface GuildSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  leaderCharacterId: string;
  leaderCharacterName: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuildDetailsResponse extends GuildSummaryResponse {
  members: GuildMemberResponse[];
}

export interface GuildWarSummaryResponse {
  id: string;
  attackerGuildId: string;
  attackerGuildName: string;
  defenderGuildId: string;
  defenderGuildName: string;
  winnerGuildId: string | null;
  winnerGuildName: string | null;
  status: string;
  summary: string | null;
  startedByCharacterId: string;
  startedByCharacterName: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface GuildWarDetailsResponse extends GuildWarSummaryResponse {
  rewardPerMember: string | null;
}

@Injectable()
export class GuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async createGuild(userId: string, dto: CreateGuildDto): Promise<GuildDetailsResponse> {
    const character = await this.charactersService.getByUserId(userId);
    await this.assertCharacterHasNoGuild(character.id);

    try {
      const guild = await this.prisma.$transaction(async (tx) => {
        const createdGuild = await tx.guild.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            leaderCharacterId: character.id,
            members: {
              create: {
                characterId: character.id,
                role: 'LEADER',
              },
            },
          },
          include: {
            leaderCharacter: { select: { id: true, name: true } },
            members: { include: { character: { select: { id: true, name: true, level: true } } } },
          },
        });

        return createdGuild;
      });

      return this.toDetailsResponse(guild);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Gildia o takiej nazwie już istnieje');
      }
      throw error;
    }
  }

  async listGuilds(limit = 20): Promise<GuildSummaryResponse[]> {
    const guilds = await this.prisma.guild.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        leaderCharacter: { select: { id: true, name: true } },
        members: { select: { id: true } },
      },
    });

    return guilds.map((guild) => this.toSummaryResponse(guild));
  }

  async getGuildById(guildId: string): Promise<GuildDetailsResponse> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        leaderCharacter: { select: { id: true, name: true } },
        members: {
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          include: { character: { select: { id: true, name: true, level: true } } },
        },
      },
    });

    if (!guild) {
      throw new NotFoundException('Gildia nie istnieje');
    }

    return this.toDetailsResponse(guild);
  }

  async getMyGuild(userId: string): Promise<GuildDetailsResponse | null> {
    const character = await this.charactersService.getByUserId(userId);
    const membership = await this.prisma.guildMember.findUnique({
      where: { characterId: character.id },
      include: {
        guild: {
          include: {
            leaderCharacter: { select: { id: true, name: true } },
            members: {
              orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
              include: { character: { select: { id: true, name: true, level: true } } },
            },
          },
        },
      },
    });

    return membership ? this.toDetailsResponse(membership.guild) : null;
  }

  async joinGuild(userId: string, guildId: string): Promise<GuildDetailsResponse> {
    const character = await this.charactersService.getByUserId(userId);
    await this.assertCharacterHasNoGuild(character.id);

    await this.prisma.$transaction(async (tx) => {
      const guild = await tx.guild.findUnique({
        where: { id: guildId },
        include: { _count: { select: { members: true } } },
      });
      if (!guild) {
        throw new NotFoundException('Gildia nie istnieje');
      }
      if (guild._count.members >= MAX_GUILD_MEMBERS) {
        throw new ConflictException('Bractwo osiągnęło limit 20 członków');
      }

      await tx.guildMember.create({
        data: {
          guildId,
          characterId: character.id,
          role: 'MEMBER',
        },
      });
    });

    return this.getGuildById(guildId);
  }

  async leaveGuild(userId: string): Promise<void> {
    const character = await this.charactersService.getByUserId(userId);
    const membership = await this.prisma.guildMember.findUnique({
      where: { characterId: character.id },
      include: { guild: { include: { members: true } } },
    });

    if (!membership) {
      throw new NotFoundException('Nie należysz do żadnej gildii');
    }

    if (membership.role === 'LEADER' && membership.guild.members.length > 1) {
      throw new ConflictException('Lider nie może opuścić gildii bez przekazania przywództwa');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.guildMember.delete({ where: { characterId: character.id } });

      if (membership.role === 'LEADER') {
        await tx.guild.delete({ where: { id: membership.guildId } });
      }
    });
  }

  async transferLeadership(userId: string, targetCharacterId: string): Promise<GuildDetailsResponse> {
    const { character, membership } = await this.requireLeaderGuildMembership(userId);
    if (targetCharacterId === character.id) {
      throw new ConflictException('Już jesteś liderem tego bractwa');
    }

    const target = await this.prisma.guildMember.findUnique({ where: { characterId: targetCharacterId } });
    if (!target || target.guildId !== membership.guildId) {
      throw new NotFoundException('Wybrany bohater nie należy do Twojego bractwa');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.guild.update({
        where: { id: membership.guildId },
        data: { leaderCharacterId: targetCharacterId },
      });
      await tx.guildMember.update({
        where: { characterId: character.id },
        data: { role: 'MEMBER' },
      });
      await tx.guildMember.update({
        where: { characterId: targetCharacterId },
        data: { role: 'LEADER' },
      });
    });

    return this.getGuildById(membership.guildId);
  }

  async removeMember(userId: string, targetCharacterId: string): Promise<GuildDetailsResponse> {
    const { character, membership } = await this.requireLeaderGuildMembership(userId);
    if (targetCharacterId === character.id) {
      throw new ConflictException('Lider nie może usunąć samego siebie');
    }

    const target = await this.prisma.guildMember.findUnique({ where: { characterId: targetCharacterId } });
    if (!target || target.guildId !== membership.guildId) {
      throw new NotFoundException('Wybrany bohater nie należy do Twojego bractwa');
    }
    if (target.role === 'LEADER') {
      throw new ConflictException('Nie można usunąć lidera bractwa');
    }

    await this.prisma.guildMember.delete({ where: { characterId: targetCharacterId } });
    return this.getGuildById(membership.guildId);
  }

  async declareGuildWar(userId: string, targetGuildId: string): Promise<GuildWarDetailsResponse> {
    const { character, membership } = await this.requireLeaderGuildMembership(userId);

    if (membership.guildId === targetGuildId) {
      throw new ConflictException('Nie możesz wypowiedzieć wojny własnej gildii');
    }

    const targetGuild = await this.prisma.guild.findUnique({
      where: { id: targetGuildId },
      include: { leaderCharacter: { select: { id: true, name: true } } },
    });
    if (!targetGuild) {
      throw new NotFoundException('Docelowa gildia nie istnieje');
    }

    const existingWar = await this.prisma.guildWar.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            attackerGuildId: membership.guildId,
            defenderGuildId: targetGuildId,
          },
          {
            attackerGuildId: targetGuildId,
            defenderGuildId: membership.guildId,
          },
        ],
      },
    });
    if (existingWar) {
      throw new ConflictException('Między tymi gildiami trwa już wojna');
    }

    const war = await this.prisma.guildWar.create({
      data: {
        attackerGuildId: membership.guildId,
        defenderGuildId: targetGuildId,
        startedByCharacterId: character.id,
      },
      include: this.guildWarInclude(),
    });

    return this.toWarDetailsResponse(war, null);
  }

  async listGuildWars(limit = 20): Promise<GuildWarSummaryResponse[]> {
    const wars = await this.prisma.guildWar.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: this.guildWarInclude(),
    });

    return wars.map((war) => this.toWarSummaryResponse(war));
  }

  async listMyGuildWars(userId: string, limit = 20): Promise<GuildWarSummaryResponse[]> {
    const { membership } = await this.requireGuildMembership(userId);
    const wars = await this.prisma.guildWar.findMany({
      take: limit,
      where: {
        OR: [{ attackerGuildId: membership.guildId }, { defenderGuildId: membership.guildId }],
      },
      orderBy: { startedAt: 'desc' },
      include: this.guildWarInclude(),
    });

    return wars.map((war) => this.toWarSummaryResponse(war));
  }

  async getGuildWarById(warId: string): Promise<GuildWarDetailsResponse> {
    const war = await this.prisma.guildWar.findUnique({
      where: { id: warId },
      include: this.guildWarInclude(),
    });

    if (!war) {
      throw new NotFoundException('Wojna gildii nie istnieje');
    }

    return this.toWarDetailsResponse(war, null);
  }

  async resolveGuildWar(
    userId: string,
    warId: string,
    rng: () => number = Math.random,
  ): Promise<GuildWarDetailsResponse> {
    const { membership } = await this.requireLeaderGuildMembership(userId);
    const war = await this.prisma.guildWar.findUnique({
      where: { id: warId },
      include: this.guildWarInclude(),
    });
    if (!war) {
      throw new NotFoundException('Wojna gildii nie istnieje');
    }
    if (membership.guildId !== war.attackerGuildId && membership.guildId !== war.defenderGuildId) {
      throw new ConflictException('Tylko lider walczącego bractwa może rozstrzygnąć wojnę');
    }
    if (war.status !== 'ACTIVE') {
      throw new ConflictException('Ta wojna została już rozstrzygnięta');
    }

    const [attackerPower, defenderPower] = await Promise.all([
      this.calculateGuildPower(war.attackerGuildId),
      this.calculateGuildPower(war.defenderGuildId),
    ]);
    const rawChance = attackerPower / Math.max(1, attackerPower + defenderPower);
    const attackerChance = Math.min(0.75, Math.max(0.25, rawChance));
    const winnerGuildId = rng() < attackerChance ? war.attackerGuildId : war.defenderGuildId;
    const winnerName = winnerGuildId === war.attackerGuildId
      ? war.attackerGuild.name
      : war.defenderGuild.name;
    const summary = `${winnerName} zwycięża po starciu sił ${attackerPower} do ${defenderPower}.`;

    return this.finishGuildWar(userId, warId, winnerGuildId, summary);
  }

  async finishGuildWar(
    userId: string,
    warId: string,
    winnerGuildId?: string | null,
    summary?: string | null,
  ): Promise<GuildWarDetailsResponse> {
    const { membership } = await this.requireLeaderGuildMembership(userId);
    const war = await this.prisma.guildWar.findUnique({
      where: { id: warId },
      include: this.guildWarInclude(),
    });

    if (!war) {
      throw new NotFoundException('Wojna gildii nie istnieje');
    }

    if (membership.guildId !== war.attackerGuildId && membership.guildId !== war.defenderGuildId) {
      throw new ConflictException('Tylko lider jednej z walczących gildii może zakończyć wojnę');
    }

    if (war.status !== 'ACTIVE') {
      throw new ConflictException('Ta wojna już się zakończyła');
    }

    if (
      winnerGuildId &&
      winnerGuildId !== war.attackerGuildId &&
      winnerGuildId !== war.defenderGuildId
    ) {
      throw new ConflictException('Zwycięzcą musi być jedna z walczących gildii');
    }

    const rewardPerMember = winnerGuildId ? 50n : null;

    const updatedWar = await this.prisma.$transaction(async (tx) => {
      const nextWar = await tx.guildWar.update({
        where: { id: warId },
        data: {
          status: 'FINISHED',
          winnerGuildId: winnerGuildId ?? null,
          summary: summary ?? war.summary,
          finishedAt: new Date(),
        },
        include: this.guildWarInclude(),
      });

      if (winnerGuildId && rewardPerMember) {
        await this.rewardGuildMembers(tx, winnerGuildId, nextWar.id, rewardPerMember);
      }

      return tx.guildWar.findUniqueOrThrow({
        where: { id: nextWar.id },
        include: this.guildWarInclude(),
      });
    });

    return this.toWarDetailsResponse(updatedWar, rewardPerMember);
  }

  private async assertCharacterHasNoGuild(characterId: string): Promise<void> {
    const existingMembership = await this.prisma.guildMember.findUnique({
      where: { characterId },
    });

    if (existingMembership) {
      throw new ConflictException('Ta postać należy już do gildii');
    }
  }

  private async requireGuildMembership(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const membership = await this.prisma.guildMember.findUnique({
      where: { characterId: character.id },
      include: { guild: true },
    });

    if (!membership) {
      throw new NotFoundException('Nie należysz do żadnej gildii');
    }

    return { character, membership };
  }

  private async requireLeaderGuildMembership(userId: string) {
    const data = await this.requireGuildMembership(userId);

    if (data.membership.role !== 'LEADER') {
      throw new ConflictException('Tylko lider gildii może wykonać tę czynność');
    }

    return data;
  }

  private async rewardGuildMembers(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    guildId: string,
    warId: string,
    rewardPerMember: bigint,
  ): Promise<void> {
    const guild = await tx.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: { character: true },
        },
      },
    });

    if (!guild) {
      return;
    }

    for (const member of guild.members) {
      const nextGold = member.character.gold + rewardPerMember;
      await tx.character.update({
        where: { id: member.characterId },
        data: { gold: nextGold },
      });
      await tx.transaction.create({
        data: {
          characterId: member.characterId,
          type: 'GUILD_WAR_REWARD',
          amount: rewardPerMember,
          balanceAfter: nextGold,
          referenceId: warId,
          description: `Nagroda za zwycięstwo gildii ${guild.name}`,
        },
      });
    }
  }

  private async calculateGuildPower(guildId: string): Promise<number> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: {
            character: {
              include: {
                combatant: {
                  include: { stats: true, equippedItems: { include: { item: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!guild) return 1;

    return Math.max(1, Math.round(guild.members.reduce((total, member) => {
      const stats = member.character.combatant.stats;
      const statPower = stats
        ? stats.strength + stats.agility + stats.endurance + stats.intelligence + stats.parryRating
        : 0;
      const equipmentPower = member.character.combatant.equippedItems.reduce((sum, entry) => {
        const item = entry.item;
        return sum + item.attackPower * 2 + item.defensePower * 2 + item.maxHpBonus / 5
          + item.strengthBonus + item.agilityBonus + item.enduranceBonus + item.intelligenceBonus;
      }, 0);
      return total + member.character.level * 20 + statPower * 3 + equipmentPower;
    }, 0)));
  }

  private guildWarInclude() {
    return {
      attackerGuild: { include: { leaderCharacter: { select: { id: true, name: true } } } },
      defenderGuild: { include: { leaderCharacter: { select: { id: true, name: true } } } },
      winnerGuild: { include: { leaderCharacter: { select: { id: true, name: true } } } },
      startedByCharacter: { select: { id: true, name: true } },
    } as const;
  }

  private toWarSummaryResponse(war: {
    id: string;
    attackerGuildId: string;
    defenderGuildId: string;
    winnerGuildId: string | null;
    status: string;
    summary: string | null;
    startedByCharacterId: string;
    startedAt: Date;
    finishedAt: Date | null;
    attackerGuild: { id: string; name: string };
    defenderGuild: { id: string; name: string };
    winnerGuild: { id: string; name: string } | null;
    startedByCharacter: { id: string; name: string };
  }): GuildWarSummaryResponse {
    return {
      id: war.id,
      attackerGuildId: war.attackerGuildId,
      attackerGuildName: war.attackerGuild.name,
      defenderGuildId: war.defenderGuildId,
      defenderGuildName: war.defenderGuild.name,
      winnerGuildId: war.winnerGuildId,
      winnerGuildName: war.winnerGuild?.name ?? null,
      status: war.status,
      summary: war.summary,
      startedByCharacterId: war.startedByCharacterId,
      startedByCharacterName: war.startedByCharacter.name,
      startedAt: war.startedAt.toISOString(),
      finishedAt: war.finishedAt ? war.finishedAt.toISOString() : null,
    };
  }

  private toWarDetailsResponse(
    war: Parameters<typeof this.toWarSummaryResponse>[0],
    rewardPerMember: bigint | null,
  ): GuildWarDetailsResponse {
    return {
      ...this.toWarSummaryResponse(war),
      rewardPerMember: rewardPerMember ? rewardPerMember.toString() : null,
    };
  }

  private toSummaryResponse(guild: {
    id: string;
    name: string;
    description: string | null;
    leaderCharacterId: string;
    leaderCharacter: { id: string; name: string };
    members: Array<unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): GuildSummaryResponse {
    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      leaderCharacterId: guild.leaderCharacterId,
      leaderCharacterName: guild.leaderCharacter.name,
      memberCount: guild.members.length,
      createdAt: guild.createdAt.toISOString(),
      updatedAt: guild.updatedAt.toISOString(),
    };
  }

  private toDetailsResponse(guild: {
    id: string;
    name: string;
    description: string | null;
    leaderCharacterId: string;
    leaderCharacter: { id: string; name: string };
    members: Array<{
      characterId: string;
      role: string;
      joinedAt: Date;
      character: { id: string; name: string; level: number };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): GuildDetailsResponse {
    return {
      ...this.toSummaryResponse(guild),
      members: guild.members.map((member) => ({
        characterId: member.characterId,
        characterName: member.character.name,
        level: member.character.level,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
      })),
    };
  }
}
