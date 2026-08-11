import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fightTavernEncounter } from '../../api/tavern.api';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { ArenaOpponent, Character, TavernQuestCombatStage, TavernQuestRun } from '../../types/game';
import { ArenaSequence, type CombatSequenceResult } from './ArenaSequence';

interface TavernEncounterProps {
  quest: TavernQuestRun;
  stage: TavernQuestCombatStage;
  onAdvance: (quest: TavernQuestRun) => void;
  chronicleTrail?: ReactNode;
  travelState?: ReactNode;
}

const QUEST_ART = {
  EASY: '/assets/missions/mission-tier-2.jpg',
  MEDIUM: '/assets/missions/mission-tier-3.jpg',
  HARD: '/assets/missions/mission-tier-5.jpg',
} as const;

const CHALLENGE = {
  EASY: 'KORZYSTNY',
  MEDIUM: 'WYRÓWNANY',
  HARD: 'WYMAGAJĄCY',
} as const satisfies Record<TavernQuestRun['difficulty'], ArenaOpponent['challenge']>;

export function TavernEncounter({ quest, stage, onAdvance, chronicleTrail, travelState }: TavernEncounterProps) {
  const queryClient = useQueryClient();
  const character = queryClient.getQueryData<Character>(['character', 'me']);
  const [resolvedQuest, setResolvedQuest] = useState<TavernQuestRun | null>(null);
  const fightMutation = useMutation({
    mutationFn: fightTavernEncounter,
    onSuccess: (nextQuest) => {
      setResolvedQuest(nextQuest);
    },
  });

  const encounter = resolvedQuest?.encounters[resolvedQuest.encounters.length - 1] ?? null;
  const atlasPosition = stage.enemy.atlasPosition;
  const portraitPosition = `${(atlasPosition % 3) * 50}% ${Math.floor(atlasPosition / 3) * 50}%`;
  const enemySignature = stage.enemy.signature;
  const questDecisions = quest.decisions ?? [];
  const questPuzzles = quest.puzzles ?? [];
  const signatureSuppressed = Boolean(
    enemySignature?.counteredBy?.choiceIds?.some((choiceId) =>
      questDecisions.some((decision) => decision.choiceId === choiceId && decision.succeeded),
    ) || enemySignature?.counteredBy?.puzzleKeys?.some((puzzleKey) =>
      questPuzzles.some((puzzle) => puzzle.puzzleKey === puzzleKey && puzzle.solved),
    ),
  );
  const combatResult = useMemo<CombatSequenceResult | null>(() => {
    if (!encounter) return null;
    const playerCombatantId = encounter.rounds.find((round) => !round.actorId.startsWith('tavern-enemy:'))?.actorId ?? `tavern-hero:${quest.id}`;
    const enemyCombatantId = encounter.rounds.find((round) => round.actorId.startsWith('tavern-enemy:'))?.actorId ?? `tavern-enemy:${encounter.enemyKey}`;
    return {
      id: encounter.id,
      result: encounter.result,
      expReward: 0,
      goldReward: 0,
      rounds: encounter.rounds.map((round, index) => ({ ...round, id: `${encounter.id}:${index}` })),
      attacker: {
        combatantId: playerCombatantId,
        name: character?.name ?? 'Bohater Etherii',
        level: character?.level ?? Math.max(1, encounter.enemyLevel),
        maxHp: quest.health.max,
        startingHp: encounter.playerHpBefore,
      },
      defender: {
        combatantId: enemyCombatantId,
        name: encounter.enemyName,
        level: encounter.enemyLevel,
        maxHp: encounter.enemyMaxHp,
      },
      expertiseReward: null,
      arenaProfile: null,
    };
  }, [character?.level, character?.name, encounter, quest.health.max, quest.id]);

  if (resolvedQuest && encounter && combatResult) {
    return <ArenaSequence
      opponent={{ name: encounter.enemyName }}
      result={combatResult}
      challenge={CHALLENGE[quest.difficulty]}
      onComplete={() => onAdvance(resolvedQuest)}
      presentation={{
        ariaLabel: `Starcie podczas zlecenia: ${stage.title}`,
        backgroundSrc: QUEST_ART[quest.difficulty],
        header: `${quest.title} · ${quest.region}`,
        resultHeader: 'Rozstrzygnięcie na szlaku',
        waitingKicker: stage.finalEncounter ? 'Ostatnia przeszkoda staje na drodze bohatera' : 'Cień przecina drogę bohatera',
        waitingTitle: 'Przeciwnicy chwytają za broń…',
        introKicker: stage.enemy.familyLabel,
        introCaption: stage.finalEncounter ? 'Los wyprawy rozstrzygnie się teraz' : 'Szlak zażądał krwi',
        resultKicker: encounter.won ? 'Droga przez Etherię stoi otworem' : 'Kronika zapisuje cenę porażki',
        returnLabel: resolvedQuest.status === 'RESOLVED' ? 'Poznaj rozstrzygnięcie' : 'Ruszaj dalej',
        controlsLabel: 'Przebieg starcia jest odtwarzany z kroniki wyprawy',
        opponentPortrait: { src: encounter.enemyIllustrationUrl, atlasPosition: portraitPosition },
        showRewards: false,
        resultButtonDelayMs: 900,
      }}
    />;
  }

  return <section className="tavern-encounter">
    <div className="tavern-encounter-intro">
      <p className="tavern-stage-kicker">{stage.kicker}</p>
      <h1>{stage.title}</h1>
      <p>{stage.narrative}</p>
    </div>

    {chronicleTrail}

    {enemySignature ? <section className={`tavern-enemy-dossier rank-${stage.enemy.rank.toLowerCase().replace('_', '-')} ${signatureSuppressed ? 'is-countered' : ''}`} aria-label="Rozpoznanie przeciwnika">
      <header>
        <span>{stage.enemy.familyLabel}</span>
      </header>
      <div>
        <small>{stage.enemy.form}</small>
        <strong>{enemySignature.name}</strong>
        <p>{enemySignature.description}</p>
      </div>
      <aside>
        <span>{signatureSuppressed ? 'Przewaga zdobyta' : 'Możliwa odpowiedź'}</span>
        <p>{signatureSuppressed ? `Wiedza zdobyta wcześniej przełamuje zdolność „${enemySignature.name}”.` : enemySignature.counterplay}</p>
      </aside>
    </section> : null}

    {travelState}

    <div className="tavern-encounter-command">
      <button type="button" disabled={fightMutation.isPending} onClick={() => fightMutation.mutate()}>{fightMutation.isPending ? 'Ostrza krzyżują się…' : 'Stań do walki'}</button>
      {fightMutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(fightMutation.error)}</p> : null}
    </div>
  </section>;
}
