import { resolveTavernEnding } from './tavern.endings';
import { TAVERN_STORY_RELICS } from './tavern.relics';
import { TAVERN_QUEST_TEMPLATES } from './tavern.templates';

describe('resolveTavernEnding', () => {
  const base = { templateKey: 'ash-road-lantern', title: 'Ostatnia Warta na Równinach', region: 'Popielny Trakt' };

  it('zwraca osobne zakończenie porażki', () => {
    expect(resolveTavernEnding({ ...base, result: 'FAILURE', score: 8 }).key).toBe('ash-road-lantern:failure');
  });

  it('zwraca pyrrusowe zwycięstwo przy słabym przebiegu', () => {
    expect(resolveTavernEnding({ ...base, result: 'SUCCESS', score: 2 }).kind).toBe('COSTLY');
  });

  it('rozróżnia drogę wiedzy od pościgu', () => {
    expect(resolveTavernEnding({ ...base, result: 'SUCCESS', score: 4, choiceIds: ['leave-crystal-with-refugees'] }).kind).toBe('INSIGHT');
    expect(resolveTavernEnding({ ...base, result: 'SUCCESS', score: 4, choiceIds: ['reclaim-crystal-for-garrison'] }).kind).toBe('PURSUIT');
  });

  it('każda historia ma trzy własne finały i unikatowy relikt', () => {
    const relicNames = TAVERN_QUEST_TEMPLATES.map((template) => TAVERN_STORY_RELICS[template.key]?.name);
    expect(relicNames.every(Boolean)).toBe(true);
    expect(new Set(relicNames).size).toBe(TAVERN_QUEST_TEMPLATES.length);
    const authoredChoices: Record<string, [string, string]> = {
      'ash-road-lantern': ['leave-crystal-with-refugees', 'reclaim-crystal-for-garrison'],
      'mill-below-walls': ['read-erased-mill-ledger', 'hunt-flour-smugglers'],
      'stone-bridge-voices': ['preserve-vael-memory', 'yield-memory-to-order'],
      'bone-chimera-heart': ['guide-golem-to-lantern', 'shatter-lantern-core'],
    };
    for (const template of TAVERN_QUEST_TEMPLATES) {
      const story = { templateKey: template.key, title: template.title, region: template.region };
      const [insightChoice, pursuitChoice] = authoredChoices[template.key] ?? ['read-the-signs', 'follow-the-trail'];
      const insight = resolveTavernEnding({ ...story, result: 'SUCCESS', score: 4, firstChoiceId: insightChoice, choiceIds: [insightChoice] });
      const pursuit = resolveTavernEnding({ ...story, result: 'SUCCESS', score: 4, firstChoiceId: pursuitChoice, choiceIds: [pursuitChoice] });
      const failure = resolveTavernEnding({ ...story, result: 'FAILURE', score: 0 });
      expect(new Set([insight.title, pursuit.title, failure.title]).size).toBe(3);
    }
  });

  it('uses the old mill investigation route to select its ending', () => {
    const mill = { templateKey: 'mill-below-walls', title: 'Cisza pod starym młynem', region: 'Przedmieścia Etherii' };
    const truth = resolveTavernEnding({ ...mill, result: 'SUCCESS', score: 4, choiceIds: ['read-erased-mill-ledger'] });
    const pursuit = resolveTavernEnding({ ...mill, result: 'SUCCESS', score: 4, choiceIds: ['hunt-flour-smugglers'] });
    expect(truth.kind).toBe('INSIGHT');
    expect(truth.title).toBe('Imiona spod mąki');
    expect(pursuit.kind).toBe('PURSUIT');
    expect(pursuit.title).toBe('Koło zatrzymane ostrzem');
  });
});
