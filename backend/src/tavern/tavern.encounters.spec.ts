import { buildTavernEnemySnapshot, getTavernEnemy, isTavernCombatStage, shouldResolveTavernQuestAfterCombat } from './tavern.encounters';
import { TAVERN_ENEMIES } from './tavern.bestiary';
import { TAVERN_QUEST_TEMPLATES } from './tavern.templates';

describe('tavern encounters', () => {
  it('ends the quest immediately after any lost encounter', () => {
    expect(shouldResolveTavernQuestAfterCombat(false, false)).toBe(true);
    expect(shouldResolveTavernQuestAfterCombat(false, true)).toBe(true);
    expect(shouldResolveTavernQuestAfterCombat(true, false)).toBe(false);
    expect(shouldResolveTavernQuestAfterCombat(true, true)).toBe(true);
  });

  it('places one, two and three encounters in quests by difficulty', () => {
    expect([0, 1, 2].filter((index) => isTavernCombatStage('EASY', index, 3))).toEqual([2]);
    expect([0, 1, 2, 3].filter((index) => isTavernCombatStage('MEDIUM', index, 4))).toEqual([1, 3]);
    expect([0, 1, 2, 3, 4].filter((index) => isTavernCombatStage('HARD', index, 5))).toEqual([1, 3, 4]);
  });

  it('selects the boss for the final encounter', () => {
    const enemy = getTavernEnemy({ templateKey: 'bone-chimera-heart', difficulty: 'HARD', stageIndex: 4, stageCount: 5, score: 0 });
    expect(enemy.key).toBe('seal-golem');
  });

  it('ends every hard quest with a raid boss', () => {
    const hardQuests = TAVERN_QUEST_TEMPLATES.filter((template) => template.difficulty === 'HARD');
    for (const quest of hardQuests) {
      const enemy = getTavernEnemy({
        templateKey: quest.key,
        difficulty: quest.difficulty,
        stageIndex: quest.stageCount - 1,
        stageCount: quest.stageCount,
        score: 0,
      });
      expect(enemy.rank).toBe('RAID_BOSS');
    }
  });

  it('allows authored stories to replace the generic encounter layout', () => {
    const stages = [0, 1, 2, 3, 4].filter((index) => isTavernCombatStage('HARD', index, 5, 'bone-chimera-heart'));
    expect(stages).toEqual([1, 4]);
  });

  it('rewards successful preparation by weakening the fixed-level enemy', () => {
    const enemy = getTavernEnemy({ templateKey: 'ash-road-lantern', difficulty: 'EASY', stageIndex: 3, stageCount: 4, score: 0 });
    const unprepared = buildTavernEnemySnapshot(enemy, 'EASY', 10, -4);
    const prepared = buildTavernEnemySnapshot(enemy, 'EASY', 10, 6);
    expect(prepared.preparationPercent).toBe(12);
    expect(prepared.snapshot.attackPower).toBeLessThan(unprepared.snapshot.attackPower);
    expect(prepared.snapshot.endurance).toBeLessThan(unprepared.snapshot.endurance);
  });

  it('keeps every authored enemy inside one of the four lore families', () => {
    const enemies = Object.values(TAVERN_ENEMIES).flat();
    expect(enemies).toHaveLength(17);
    expect(new Set(enemies.map((enemy) => enemy.family))).toEqual(new Set([
      'ECHO_BEAST',
      'AWAKENED_GUARDIAN',
      'VOID_ENTITY',
      'HUMAN',
    ]));
    expect(enemies.every((enemy) =>
      enemy.formerPurpose &&
      enemy.fractureEffect &&
      enemy.silhouette &&
      enemy.uniqueDetail &&
      enemy.signature.name &&
      enemy.visualDirection.composition,
    )).toBe(true);
  });

  it('suppresses a signature ability after the matching lore discovery', () => {
    const enemy = getTavernEnemy({
      templateKey: 'bone-chimera-heart', difficulty: 'HARD', stageIndex: 4, stageCount: 5, score: 2,
    });
    const active = buildTavernEnemySnapshot(enemy, 'HARD', 65, 2);
    const countered = buildTavernEnemySnapshot(enemy, 'HARD', 65, 2, {
      solvedPuzzleKeys: ['golem-march-order'],
    });

    expect(active.signatureSuppressed).toBe(false);
    expect(active.snapshot.damageTakenMultiplier).toBeCloseTo(0.87);
    expect(countered.signatureSuppressed).toBe(true);
    expect(countered.snapshot.damageTakenMultiplier).toBe(1);
    expect(countered.snapshot.criticalResistanceModifier).toBeCloseTo(0.025);
  });
});
