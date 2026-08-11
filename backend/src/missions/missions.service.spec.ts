import { Test, TestingModule } from '@nestjs/testing';
import { CharactersService } from '../characters/characters.service';
import { PrismaService } from '../prisma/prisma.service';
import { MissionsService } from './missions.service';

describe('MissionsService', () => {
  it('returns final mission values including property bonuses', async () => {
    const character = {
      id: 'character-1',
      combatantId: 'combatant-1',
      level: 10,
      experience: 0n,
      gold: 0n,
      reputation: 0,
      currentHp: null,
      healthUpdatedAt: new Date(),
      avatarUrl: null,
      property: { level: 2 },
      combatant: {
        id: 'combatant-1',
        stats: {
          combatantId: 'combatant-1',
          strength: 5,
          agility: 5,
          endurance: 5,
          intelligence: 5,
          unspentPoints: 0,
          parryRating: 0,
          updatedAt: new Date(),
        },
        equippedItems: [],
        weaponExpertise: [],
      },
    };
    const prisma = {
      missionProgress: { findUnique: jest.fn().mockResolvedValue(null) },
      missionAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const charactersService = {
      getByUserId: jest.fn().mockResolvedValue(character),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CharactersService, useValue: charactersService },
      ],
    }).compile();
    const service = module.get(MissionsService);

    const result = await service.getOverview('user-1');

    expect(result.successChance).toBe(70.3);
    expect(result.propertyBonus).toEqual({
      level: 2,
      successPercent: 0.3,
      goldPercent: 0.8,
      itemChancePercent: 0.1,
    });
    expect(result.tiers[4].goldMin).toBe(290);
    expect(result.tiers[4].goldMax).toBe(442);
    expect(result.tiers[4].itemRewardChance).toBe(15.1);
  });
});
