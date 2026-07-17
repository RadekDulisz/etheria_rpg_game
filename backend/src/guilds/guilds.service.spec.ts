import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { GuildsService } from './guilds.service';

describe('GuildsService', () => {
  let service: GuildsService;
  let prisma: any;
  let charactersService: { getByUserId: jest.Mock };

  const leaderCharacter = {
    id: 'char-1',
    name: 'Leader',
    level: 10,
  };

  const guildRecord = {
    id: 'guild-1',
    name: 'Wolves',
    description: 'Pack',
    leaderCharacterId: leaderCharacter.id,
    leaderCharacter: { id: leaderCharacter.id, name: leaderCharacter.name },
    members: [
      {
        characterId: leaderCharacter.id,
        role: 'LEADER',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        character: {
          id: leaderCharacter.id,
          name: leaderCharacter.name,
          level: leaderCharacter.level,
        },
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const targetGuildRecord = {
    id: 'guild-2',
    name: 'Hawks',
    description: 'Sky',
    leaderCharacterId: 'char-2',
    leaderCharacter: { id: 'char-2', name: 'TargetLeader' },
  };

  const activeWarRecord = {
    id: 'war-1',
    attackerGuildId: 'guild-1',
    defenderGuildId: 'guild-2',
    winnerGuildId: null,
    status: 'ACTIVE',
    summary: null,
    startedByCharacterId: leaderCharacter.id,
    startedAt: new Date('2026-01-02T00:00:00.000Z'),
    finishedAt: null,
    attackerGuild: {
      id: 'guild-1',
      name: 'Wolves',
      leaderCharacter: { id: leaderCharacter.id, name: leaderCharacter.name },
    },
    defenderGuild: {
      id: 'guild-2',
      name: 'Hawks',
      leaderCharacter: { id: 'char-2', name: 'TargetLeader' },
    },
    winnerGuild: null,
    startedByCharacter: { id: leaderCharacter.id, name: leaderCharacter.name },
  };

  const finishedWarRecord = {
    ...activeWarRecord,
    status: 'FINISHED',
    winnerGuildId: 'guild-1',
    summary: 'Wolves won',
    finishedAt: new Date('2026-01-03T00:00:00.000Z'),
    winnerGuild: {
      id: 'guild-1',
      name: 'Wolves',
      leaderCharacter: { id: leaderCharacter.id, name: leaderCharacter.name },
    },
  };

  beforeEach(async () => {
    prisma = {
      guild: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      guildMember: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      guildWar: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      character: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    charactersService = {
      getByUserId: jest.fn().mockResolvedValue(leaderCharacter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
  });

  it('tworzy gildie i zapisuje lidera jako czlonka', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce(null);
    prisma.guild.create.mockResolvedValueOnce(guildRecord);

    const result = await service.createGuild('user-1', {
      name: 'Wolves',
      description: 'Pack',
    } as CreateGuildDto);

    expect(prisma.guild.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Wolves',
          leaderCharacterId: leaderCharacter.id,
        }),
      }),
    );
    expect(result.name).toBe('Wolves');
    expect(result.members).toHaveLength(1);
  });

  it('rzuca ConflictException, gdy postac nalezy juz do gildii', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce({ id: 'member-1' });

    await expect(
      service.createGuild('user-1', { name: 'Wolves' } as CreateGuildDto),
    ).rejects.toThrow(ConflictException);
  });

  it('rzuca NotFoundException, gdy gildia nie istnieje przy dolaczeniu', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce(null);
    prisma.guild.findUnique.mockResolvedValueOnce(null);

    await expect(service.joinGuild('user-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('nie pozwala dolaczyc do bractwa majacego dwudziestu czlonkow', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce(null);
    prisma.guild.findUnique.mockResolvedValueOnce({ id: 'guild-1', _count: { members: 20 } });

    await expect(service.joinGuild('user-1', 'guild-1')).rejects.toThrow(ConflictException);
    expect(prisma.guildMember.create).not.toHaveBeenCalled();
  });

  it('nie pozwala liderowi opuscic gildii gdy sa inni czlonkowie', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce({
      characterId: leaderCharacter.id,
      role: 'LEADER',
      guildId: 'guild-1',
      guild: { members: [{ id: 'm1' }, { id: 'm2' }] },
    });

    await expect(service.leaveGuild('user-1')).rejects.toThrow(ConflictException);
  });

  it('rozpuszcza gildie, gdy lider jest jedynym czlonkiem', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce({
      characterId: leaderCharacter.id,
      role: 'LEADER',
      guildId: 'guild-1',
      guild: { members: [{ id: 'm1' }] },
    });

    await service.leaveGuild('user-1');

    expect(prisma.guild.delete).toHaveBeenCalledWith({ where: { id: 'guild-1' } });
  });

  it('pozwala liderowi przekazac przywodztwo innemu czlonkowi', async () => {
    prisma.guildMember.findUnique
      .mockResolvedValueOnce({
        characterId: leaderCharacter.id,
        role: 'LEADER',
        guildId: 'guild-1',
        guild: { id: 'guild-1', name: 'Wolves' },
      })
      .mockResolvedValueOnce({ characterId: 'char-2', role: 'MEMBER', guildId: 'guild-1' });
    prisma.guild.findUnique.mockResolvedValueOnce(guildRecord);

    await service.transferLeadership('user-1', 'char-2');

    expect(prisma.guild.update).toHaveBeenCalledWith({
      where: { id: 'guild-1' },
      data: { leaderCharacterId: 'char-2' },
    });
    expect(prisma.guildMember.update).toHaveBeenCalledWith({
      where: { characterId: 'char-2' },
      data: { role: 'LEADER' },
    });
  });

  it('wypowiada wojne przeciwko innej gildii', async () => {
    prisma.guildMember.findUnique.mockResolvedValueOnce({
      characterId: leaderCharacter.id,
      role: 'LEADER',
      guildId: 'guild-1',
      guild: { id: 'guild-1', name: 'Wolves' },
    });
    prisma.guild.findUnique.mockResolvedValueOnce(targetGuildRecord);
    prisma.guildWar.findFirst.mockResolvedValueOnce(null);
    prisma.guildWar.create.mockResolvedValueOnce(activeWarRecord);

    const result = await service.declareGuildWar('user-1', 'guild-2');

    expect(prisma.guildWar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attackerGuildId: 'guild-1',
          defenderGuildId: 'guild-2',
          startedByCharacterId: leaderCharacter.id,
        }),
      }),
    );
    expect(result.status).toBe('ACTIVE');
  });

  it('zakonczona wojna przyznaje nagrode czlonkom zwycieskiej gildii', async () => {
    prisma.guildMember.findUnique
      .mockResolvedValueOnce({
        characterId: leaderCharacter.id,
        role: 'LEADER',
        guildId: 'guild-1',
        guild: { id: 'guild-1', name: 'Wolves' },
      })
      .mockResolvedValueOnce({
        characterId: leaderCharacter.id,
        role: 'LEADER',
        guildId: 'guild-1',
        guild: { id: 'guild-1', name: 'Wolves' },
      });
    prisma.guildWar.findUnique.mockResolvedValueOnce(activeWarRecord);
    prisma.guildWar.update.mockResolvedValueOnce(finishedWarRecord);
    prisma.guildWar.findUniqueOrThrow.mockResolvedValueOnce(finishedWarRecord);
    prisma.guild.findUnique.mockResolvedValueOnce({
      id: 'guild-1',
      name: 'Wolves',
      members: [
        {
          characterId: 'char-1',
          character: { id: 'char-1', gold: 100n },
        },
        {
          characterId: 'char-3',
          character: { id: 'char-3', gold: 250n },
        },
      ],
    });

    const result = await service.finishGuildWar('user-1', 'war-1', 'guild-1', 'Wolves won');

    expect(prisma.transaction.create).toHaveBeenCalledTimes(2);
    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { gold: 150n },
    });
    expect(result.winnerGuildId).toBe('guild-1');
    expect(result.rewardPerMember).toBe('50');
  });
});
