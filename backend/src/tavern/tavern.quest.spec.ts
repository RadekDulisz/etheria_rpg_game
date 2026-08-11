import { getTavernStage, tavernChoiceTarget } from './tavern.quest';

const quest = {
  templateKey: 'ash-road-lantern',
  title: 'Ostatnia Warta na Równinach',
  region: 'Popielny Trakt',
  summary: 'Kupieckie wozy znikają przy starej latarni.',
  difficulty: 'EASY' as const,
  stageIndex: 0,
  stageCount: 4,
  score: 0,
};

describe('tavern quest stages', () => {
  it('builds an opening stage with two server-owned choices', () => {
    const stage = getTavernStage(quest);
    expect(stage?.index).toBe(0);
    expect(stage?.type).toBe('CHOICE');
    if (stage?.type !== 'CHOICE') throw new Error('Expected choice stage');
    expect(stage.choices).toHaveLength(2);
    expect(stage.choices.map((choice) => choice.attribute)).toEqual(['INT', 'DEX']);
  });

  it('builds a puzzle middle stage and a combat finale', () => {
    const middle = getTavernStage({ ...quest, stageIndex: 1 });
    expect(middle?.type).toBe('PUZZLE');
    if (middle?.type !== 'PUZZLE') throw new Error('Expected puzzle stage');
    expect(middle.puzzleKey).toBe('last-watch-banner');
    expect(middle.hint).toBeNull();
    const decision = getTavernStage({ ...quest, stageIndex: 2 });
    expect(decision?.type).toBe('CHOICE');
    if (decision?.type !== 'CHOICE') throw new Error('Expected authored choice stage');
    expect(decision.choices.map((choice) => choice.id)).toEqual(['leave-crystal-with-refugees', 'reclaim-crystal-for-garrison']);
    const finale = getTavernStage({ ...quest, stageIndex: 3 });
    expect(finale?.type).toBe('COMBAT');
    if (finale?.type !== 'COMBAT') throw new Error('Expected combat stage');
    expect(finale.enemy.name).toBe('Vargan, Ogar Popielnej Chorągwi');
    expect(finale.finalEncounter).toBe(true);
  });

  it('reveals the server hint only after a failed attempt', () => {
    const stage = getTavernStage({
      ...quest,
      stageIndex: 1,
      puzzles: [{ stageIndex: 1, attempts: 1, maxAttempts: 2, solved: null, outcomeText: 'Niepoprawna odpowiedź.' }],
    });
    expect(stage?.type).toBe('PUZZLE');
    if (stage?.type !== 'PUZZLE') throw new Error('Expected puzzle stage');
    expect(stage.hint).toContain('Przysięga podaje kolejność');
    expect(stage.feedback).toBe('Niepoprawna odpowiedź.');
  });

  it('returns no stage after completing the declared stage count', () => {
    expect(getTavernStage({ ...quest, stageIndex: 4 })).toBeNull();
  });

  it('makes later and harder checks progressively more demanding', () => {
    expect(tavernChoiceTarget('EASY', 0, 0)).toBe(9);
    expect(tavernChoiceTarget('MEDIUM', 2, 0)).toBe(12);
    expect(tavernChoiceTarget('HARD', 4, 1)).toBe(16);
  });
});
