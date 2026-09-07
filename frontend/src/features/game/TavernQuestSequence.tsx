import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { abandonTavernQuest, chooseTavernPath, claimTavernQuest, useTavernProvision } from '../../api/tavern.api';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { GemIcon } from '../../components/ui/GemIcon';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { RewardCascade, type RewardCascadeEntry } from '../../components/ui/RewardCascade';
import { HealthBar } from '../../components/ui/HealthBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TavernEncounter } from './TavernEncounter';
import { TavernPuzzle } from './TavernPuzzle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { Character, TavernOverview, TavernQuestAttribute, TavernQuestChoice, TavernQuestClaim, TavernQuestRun } from '../../types/game';
import type { TavernProvisionType } from '../../types/game';
import { tavernQuestArt } from './tavern-art';

interface TavernQuestSequenceProps {
  quest: TavernQuestRun;
  onClose: () => void;
}

const DIFFICULTY_LABEL = { EASY: 'Zlecenie łatwe', MEDIUM: 'Zlecenie średnie', HARD: 'Zlecenie trudne' } as const;

interface AttributeRollState {
  attribute: TavernQuestAttribute;
  attributeValue: number;
  phase: 'rolling' | 'resolved';
  roll?: number;
  target?: number;
  succeeded?: boolean;
}

export function TavernQuestSequence({ quest, onClose }: TavernQuestSequenceProps) {
  const queryClient = useQueryClient();
  const character = queryClient.getQueryData<Character>(['character', 'me']);
  const [transitioning, setTransitioning] = useState(false);
  const [claimed, setClaimed] = useState<TavernQuestClaim | null>(null);
  const [claimTransition, setClaimTransition] = useState(false);
  const [attributeRoll, setAttributeRoll] = useState<AttributeRollState | null>(null);
  const [pendingChoiceQuest, setPendingChoiceQuest] = useState<TavernQuestRun | null>(null);
  const [rollContinueReady, setRollContinueReady] = useState(false);
  const [rollClosing, setRollClosing] = useState(false);
  const [abandonConfirmation, setAbandonConfirmation] = useState(false);
  const rollTimers = useRef<number[]>([]);
  const claimTimer = useRef<number | null>(null);
  const stageTimer = useRef<number | null>(null);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      rollTimers.current.forEach((timer) => window.clearTimeout(timer));
      if (claimTimer.current !== null) window.clearTimeout(claimTimer.current);
      if (stageTimer.current !== null) window.clearTimeout(stageTimer.current);
    };
  }, []);

  const chooseMutation = useMutation({
    mutationFn: chooseTavernPath,
    onSuccess: (nextQuest, choiceId) => {
      const decision = [...nextQuest.decisions].reverse().find((entry) => entry.choiceId === choiceId);
      rollTimers.current.forEach((timer) => window.clearTimeout(timer));
      rollTimers.current = [];
      setPendingChoiceQuest(nextQuest);
      rollTimers.current.push(window.setTimeout(() => {
        if (decision) {
          setAttributeRoll((current) => current ? {
            ...current,
            phase: 'resolved',
            roll: decision.roll,
            target: decision.target,
            succeeded: decision.succeeded,
          } : current);
        }
      }, 2_600));
      rollTimers.current.push(window.setTimeout(() => {
        setRollContinueReady(true);
        rollTimers.current = [];
      }, 4_300));
    },
    onError: () => {
      setTransitioning(false);
      setAttributeRoll(null);
      setPendingChoiceQuest(null);
      setRollContinueReady(false);
      setRollClosing(false);
    },
  });
  const claimMutation = useMutation({
    mutationFn: claimTavernQuest,
    onSuccess: async (result) => {
      setClaimTransition(true);
      claimTimer.current = window.setTimeout(() => {
        setClaimed(result);
        setClaimTransition(false);
        claimTimer.current = null;
      }, 420);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['blacksmith'] }),
        queryClient.invalidateQueries({ queryKey: ['jeweler'] }),
      ]);
    },
  });
  const abandonMutation = useMutation({
    mutationFn: abandonTavernQuest,
    onSuccess: (nextQuest) => {
      setAbandonConfirmation(false);
      setTransitioning(true);
      stageTimer.current = window.setTimeout(() => {
        queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: nextQuest } : current);
        queryClient.setQueryData(['tavern', 'active'], nextQuest);
        setTransitioning(false);
        stageTimer.current = null;
      }, 380);
    },
  });
  const provisionMutation = useMutation({
    mutationFn: useTavernProvision,
    onSuccess: (nextQuest) => {
      queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: nextQuest } : current);
    },
  });

  function choose(choice: TavernQuestChoice) {
    if (chooseMutation.isPending || transitioning) return;
    setAttributeRoll({
      attribute: choice.attribute,
      attributeValue: getAttributeValue(character, choice.attribute),
      phase: 'rolling',
    });
    setPendingChoiceQuest(null);
    setRollContinueReady(false);
    setRollClosing(false);
    chooseMutation.mutate(choice.id);
  }

  function continueAfterRoll() {
    if (!pendingChoiceQuest || !rollContinueReady || transitioning) return;
    setTransitioning(true);
    setRollClosing(true);
    stageTimer.current = window.setTimeout(() => {
      queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: pendingChoiceQuest } : current);
      setAttributeRoll(null);
      setPendingChoiceQuest(null);
      setRollContinueReady(false);
      setRollClosing(false);
      setTransitioning(false);
      stageTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: ['tavern'] });
    }, 380);
  }

  function advanceAfterEncounter(nextQuest: TavernQuestRun) {
    if (stageTimer.current !== null) window.clearTimeout(stageTimer.current);
    setTransitioning(true);
    stageTimer.current = window.setTimeout(() => {
      queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: nextQuest } : current);
      setTransitioning(false);
      stageTimer.current = null;
      void queryClient.invalidateQueries({ queryKey: ['tavern'] });
    }, 380);
  }

  function updatePuzzleAttempt(nextQuest: TavernQuestRun) {
    queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: nextQuest } : current);
  }

  async function close() {
    queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? { ...current, activeQuest: null } : current);
    queryClient.setQueryData(['tavern', 'active'], null);
    await queryClient.invalidateQueries({ queryKey: ['tavern'] });
    onClose();
  }

  const resolved = quest.status === 'RESOLVED' || Boolean(claimed);
  const won = (claimed ?? quest).result === 'SUCCESS';
  const stage = quest.currentStage;
  const result = claimed ?? quest;

  return createPortal(
    <div className={`tavern-quest-sequence tavern-quest-${quest.difficulty.toLowerCase()} ${resolved ? `is-resolved is-${won ? 'success' : 'failure'}` : ''}`} role="dialog" aria-modal="true" aria-label={`Zlecenie: ${quest.title}`}>
      <img className="tavern-quest-art" src={tavernQuestArt(quest.templateKey, quest.difficulty)} alt="" />
      <div className="tavern-quest-shade" />
      <header className="tavern-quest-header"><BrandLogo /><span>{DIFFICULTY_LABEL[quest.difficulty]} · {quest.region}</span></header>

      {!resolved && stage?.type === 'COMBAT' ? <main key={`stage-${stage.index}-${stage.type}`} className={`tavern-stage tavern-stage-combat ${transitioning ? 'is-leaving' : 'is-entering'}`}>
        <div className="tavern-stage-progress" aria-label={`Etap ${stage.index + 1} z ${quest.stageCount}`}>
          {Array.from({ length: quest.stageCount }, (_, index) => <i key={index} className={index < stage.index ? 'done' : index === stage.index ? 'active' : ''} />)}
        </div>
        <TavernEncounter
          quest={quest}
          stage={stage}
          onAdvance={advanceAfterEncounter}
          chronicleTrail={<QuestChronicleTrail quest={quest} />}
          travelState={<QuestTravelState quest={quest} busy={provisionMutation.isPending} error={provisionMutation.error} onUse={(type) => provisionMutation.mutate(type)} />}
        />
      </main> : !resolved && stage?.type === 'PUZZLE' ? <main key={`stage-${stage.index}-${stage.type}`} className={`tavern-stage tavern-stage-puzzle ${transitioning ? 'is-leaving' : 'is-entering'}`}>
        <div className="tavern-stage-progress" aria-label={`Etap ${stage.index + 1} z ${quest.stageCount}`}>
          {Array.from({ length: quest.stageCount }, (_, index) => <i key={index} className={index < stage.index ? 'done' : index === stage.index ? 'active' : ''} />)}
        </div>
        <TavernPuzzle
          stage={stage}
          onRetry={updatePuzzleAttempt}
          onAdvance={advanceAfterEncounter}
          journeyContent={<div className="tavern-puzzle-journey">
            <QuestChronicleTrail quest={quest} />
            <QuestTravelState quest={quest} busy={provisionMutation.isPending} error={provisionMutation.error} onUse={(type) => provisionMutation.mutate(type)} />
          </div>}
        />
      </main> : !resolved && stage?.type === 'CHOICE' ? <main key={`stage-${stage.index}-${stage.type}`} className={`tavern-stage ${transitioning ? 'is-leaving' : 'is-entering'}`}>
        <div className="tavern-stage-progress" aria-label={`Etap ${stage.index + 1} z ${quest.stageCount}`}>
          {Array.from({ length: quest.stageCount }, (_, index) => <i key={index} className={index < stage.index ? 'done' : index === stage.index ? 'active' : ''} />)}
        </div>
        <p className="tavern-stage-kicker">{stage.kicker}</p>
        <h1>{stage.title}</h1>
        <p className="tavern-stage-narrative">{stage.narrative}</p>

        <QuestChronicleTrail quest={quest} />

        <QuestTravelState quest={quest} busy={provisionMutation.isPending} error={provisionMutation.error} onUse={(type) => provisionMutation.mutate(type)} />

        <section className="tavern-stage-choices" aria-label="Możliwe decyzje">
          {stage.choices.map((choice) => <button key={choice.id} type="button" className={`tavern-stage-choice is-${choice.alignment.toLowerCase()}`} disabled={chooseMutation.isPending || Boolean(attributeRoll)} onClick={() => choose(choice)}>
            <span className="tavern-choice-attribute" aria-label={`${choice.attribute}: ${getAttributeValue(character, choice.attribute)}`}>
              <b>{choice.attribute}</b>
              <strong>{getAttributeValue(character, choice.attribute)}</strong>
            </span>
            <span className="tavern-choice-copy"><strong>{choice.title}</strong><small>{choice.description}</small><em>{choice.reputationDelta > 0 ? `+${choice.reputationDelta} reputacji` : choice.reputationDelta < 0 ? `${choice.reputationDelta} reputacji` : 'Bez wpływu na reputację'}</em></span>
          </button>)}
          {attributeRoll ? <AttributeRoll state={attributeRoll} continueReady={rollContinueReady} closing={rollClosing} onContinue={continueAfterRoll} /> : null}
        </section>
        {chooseMutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(chooseMutation.error)}</p> : null}
      </main> : resolved ? <main className={`tavern-quest-result arena-result-screen expedition-arena-result arena-result-${won ? 'victory' : 'defeat'}`}>
        <p>{won ? 'Wieść dotarła do Złamanego Gryfa' : 'Borwin zamknął kronikę bez słowa'}</p>
        <h1>{won ? 'SUKCES' : 'PORAŻKA'}</h1>
        <h2>{result.endingTitle}</h2>
        <div className={`tavern-result-stage ${claimTransition ? 'is-leaving' : claimed ? 'is-rewards' : 'is-chronicle'}`}>
          {claimed ? <RewardCascade
            className="arena-reward-cascade expedition-reward-cascade tavern-result-rewards"
            initialDelay={250}
            stepDelay={390}
            entries={[
              { kind: 'gold', label: 'Złoto', value: Number(result.goldReward) },
              { kind: 'xp', label: 'Doświadczenie', value: Number(result.experienceReward) },
              { kind: 'damage', label: 'Odniesione rany', prefix: '−', value: result.hpLost },
              { kind: 'reputation', label: claimed.reputationRank.name, prefix: claimed.reputationChange > 0 ? '+' : claimed.reputationChange < 0 ? '−' : '', value: Math.abs(claimed.reputationChange) },
              ...(result.rewardItem ? [{ kind: 'item', label: 'Zdobyto przedmiot', value: result.rewardItem.name, icon: <ItemIcon item={result.rewardItem} /> } satisfies RewardCascadeEntry] : []),
              ...(result.rewardGemDefinition ? [{ kind: 'item', label: 'Zdobyto klejnot', value: result.rewardGemDefinition.name, icon: <GemIcon gem={result.rewardGemDefinition} /> } satisfies RewardCascadeEntry] : []),
              ...(result.storyRelicAwarded && result.storyRelicItem ? [{ kind: 'item', label: 'Relikt historii', value: result.storyRelicItem.name, icon: <ItemIcon item={result.storyRelicItem} /> } satisfies RewardCascadeEntry] : []),
            ]}
          /> : null}

          <div className="expedition-arena-summary tavern-result-summary">
            <p className="tavern-result-story expedition-result-outcome">{result.endingText}</p>
            {result.provisions.some((entry) => entry.used > 0) ? <div className="tavern-result-provisions"><span>Zużyty prowiant</span>{result.provisions.filter((entry) => entry.used > 0).map((entry) => <b key={entry.type}>{entry.name} × {entry.used}</b>)}</div> : null}
          </div>

          {!claimed ? <button className="tavern-result-button" type="button" disabled={claimMutation.isPending || claimTransition} onClick={() => claimMutation.mutate()}>{claimMutation.isPending || claimTransition ? 'Kronika zapisuje czyn…' : 'Zapisz czyn w kronice'}</button> : <button className="tavern-result-button" type="button" onClick={() => void close()}>Wróć do karczmy</button>}
          {claimMutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(claimMutation.error)}</p> : null}
        </div>
      </main> : null}

      {!resolved ? <footer className="tavern-quest-footer">
        <span>{quest.title}</span>
        <button type="button" className="tavern-abandon-button" disabled={abandonMutation.isPending || transitioning} onClick={() => setAbandonConfirmation(true)}>Wycofaj się ze szlaku</button>
        <strong>Etap {Math.min(quest.stageIndex + 1, quest.stageCount)} z {quest.stageCount}</strong>
      </footer> : null}
      {abandonConfirmation ? <div className="tavern-abandon-confirm">
        <ConfirmDialog
          title="Porzucić zlecenie?"
          confirmLabel={abandonMutation.isPending ? 'Bohater zawraca…' : 'Wycofaj się'}
          pending={abandonMutation.isPending}
          onCancel={() => { setAbandonConfirmation(false); abandonMutation.reset(); }}
          onConfirm={() => abandonMutation.mutate()}
        >
          <p>Zlecenie zakończy się porażką. Nie otrzymasz złota, doświadczenia ani przedmiotów, a zużyty prowiant nie wróci do sakwy.</p>
          {abandonMutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(abandonMutation.error)}</p> : null}
        </ConfirmDialog>
      </div> : null}
    </div>,
    document.body,
  );
}

function getAttributeValue(character: Character | undefined, attribute: TavernQuestAttribute): number {
  if (!character?.stats) return 0;
  if (attribute === 'STR') return character.stats.strength;
  if (attribute === 'DEX') return character.stats.agility;
  if (attribute === 'CON') return character.stats.endurance;
  return character.stats.intelligence;
}

function AttributeRoll({ state, continueReady, closing, onContinue }: { state: AttributeRollState; continueReady: boolean; closing: boolean; onContinue: () => void }) {
  const modifier = Math.floor(Math.sqrt(Math.max(0, state.attributeValue)));
  const dieValue = state.roll === undefined ? undefined : Math.max(1, state.roll - modifier);
  return createPortal(<div className={`tavern-roll-overlay ${closing ? 'is-closing' : ''}`}>
    <div className="tavern-roll-stack">
      <div className={`tavern-attribute-roll is-${state.phase} ${state.succeeded === true ? 'is-success' : state.succeeded === false ? 'is-failure' : ''}`} role="status" aria-live="polite">
        <header>
          <small>Próba losu · {state.attribute}</small>
          <h2>{state.phase === 'rolling' ? 'Kość została rzucona' : 'Los przemówił'}</h2>
          <p>Twój atrybut: <b>{state.attributeValue}</b></p>
        </header>
        <div className="tavern-dice-chamber" aria-hidden="true">
          <span className="tavern-dice-glow" />
          <TavernDie3D rolling={state.phase === 'rolling'} value={dieValue} />
          <span className="tavern-dice-shadow" />
        </div>
        {state.phase === 'resolved' ? <>
          <div className="tavern-roll-equation">
            <span><small>Rzut kością</small><b>{dieValue}</b></span>
            <em>+</em>
            <span><small>{state.attribute}</small><b>+{modifier}</b></span>
            <em>=</em>
            <span className="total"><small>Wynik</small><b>{state.roll}</b></span>
          </div>
          <p className="tavern-roll-threshold">Wymagany próg <b>{state.target}</b></p>
          <footer><strong>{state.succeeded ? 'PRÓBA UDANA' : 'PRÓBA NIEUDANA'}</strong><span>{state.succeeded ? 'Decyzja przechyliła los na Twoją stronę.' : 'Los nie odpowiedział na Twoje wezwanie.'}</span></footer>
        </> : <p className="tavern-roll-waiting">Kość zwalnia…</p>}
      </div>
      <div className="tavern-roll-action" aria-live="polite">
        {continueReady ? <button className="tavern-roll-continue" type="button" onClick={onContinue}>Przejdź dalej</button> : null}
      </div>
    </div>
  </div>, document.body);
}

interface DiePoint3D { x: number; y: number; z: number }

const DIE_VERTICES: DiePoint3D[] = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
];

const DIE_FACES: Array<{ points: number[]; normal: DiePoint3D; mark: string }> = [
  { points: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 }, mark: '1' },
  { points: [5, 1, 2, 6], normal: { x: 1, y: 0, z: 0 }, mark: '2' },
  { points: [1, 0, 3, 2], normal: { x: 0, y: 0, z: -1 }, mark: '3' },
  { points: [0, 4, 7, 3], normal: { x: -1, y: 0, z: 0 }, mark: '4' },
  { points: [7, 6, 2, 3], normal: { x: 0, y: 1, z: 0 }, mark: '5' },
  { points: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 }, mark: '6' },
];

function TavernDie3D({ rolling, value }: { rolling: boolean; value?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d')!;
    if (!context) return;
    const size = 160;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    let frame = 0;
    const startedAt = performance.now();
    // Celowo nieco dłużej niż faza oczekiwania komponentu: kostka nie może
    // zatrzymać się na technicznej ścianie tuż przed ujawnieniem wyniku.
    const duration = 2_850;

    function rotate(point: DiePoint3D, pitch: number, yaw: number): DiePoint3D {
      const pitchCos = Math.cos(pitch);
      const pitchSin = Math.sin(pitch);
      const pitchedY = point.y * pitchCos - point.z * pitchSin;
      const pitchedZ = point.y * pitchSin + point.z * pitchCos;
      const yawCos = Math.cos(yaw);
      const yawSin = Math.sin(yaw);
      return {
        x: point.x * yawCos + pitchedZ * yawSin,
        y: pitchedY,
        z: -point.x * yawSin + pitchedZ * yawCos,
      };
    }

    function draw(pitch: number, yaw: number, showResult: boolean, motionBlur = 0) {
      context.clearRect(0, 0, size, size);
      context.filter = motionBlur > 0 ? `blur(${motionBlur.toFixed(2)}px)` : 'none';
      const transformed = DIE_VERTICES.map((point) => rotate(point, pitch, yaw));
      const cameraDistance = 5.2;
      const projectionScale = 205;
      const projected = transformed.map((point) => {
        const perspective = projectionScale / (cameraDistance - point.z);
        return { x: size / 2 + point.x * perspective, y: size / 2 - point.y * perspective };
      });
      const faces = DIE_FACES.map((face, index) => {
        const normal = rotate(face.normal, pitch, yaw);
        const depth = face.points.reduce((sum, pointIndex) => sum + transformed[pointIndex].z, 0) / face.points.length;
        return { face, index, normal, depth };
      }).filter(({ normal }) => normal.z > 0.015).sort((left, right) => left.depth - right.depth);

      for (const { face, index, normal } of faces) {
        const polygon = face.points.map((pointIndex) => projected[pointIndex]);
        const center = polygon.reduce((result, point) => ({ x: result.x + point.x / polygon.length, y: result.y + point.y / polygon.length }), { x: 0, y: 0 });
        const light = Math.max(0, normal.x * -0.25 + normal.y * 0.48 + normal.z * 0.84);
        const gradient = context.createLinearGradient(center.x - 48, center.y - 48, center.x + 48, center.y + 48);
        gradient.addColorStop(0, `rgb(${Math.round(63 + light * 52)},${Math.round(45 + light * 38)},${Math.round(25 + light * 21)})`);
        gradient.addColorStop(0.52, `rgb(${Math.round(20 + light * 20)},${Math.round(18 + light * 16)},${Math.round(16 + light * 12)})`);
        gradient.addColorStop(1, 'rgb(5, 8, 10)');
        context.beginPath();
        polygon.forEach((point, pointIndex) => {
          if (pointIndex === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.closePath();
        context.fillStyle = gradient;
        context.fill();
        context.strokeStyle = `rgba(218, 169, 84, ${0.58 + light * 0.38})`;
        context.lineWidth = 1.5;
        context.stroke();
        context.beginPath();
        polygon.forEach((point, pointIndex) => {
          const inset = { x: center.x + (point.x - center.x) * 0.82, y: center.y + (point.y - center.y) * 0.82 };
          if (pointIndex === 0) context.moveTo(inset.x, inset.y);
          else context.lineTo(inset.x, inset.y);
        });
        context.closePath();
        context.strokeStyle = `rgba(238, 195, 115, ${0.14 + light * 0.22})`;
        context.lineWidth = 1;
        context.stroke();
        if (normal.z > 0.54 && (!showResult || index === 0)) {
          context.save();
          context.fillStyle = `rgba(244, 215, 157, ${0.68 + normal.z * 0.3})`;
          context.shadowColor = 'rgba(225, 165, 70, .55)';
          context.shadowBlur = 9;
          context.font = `700 ${index === 0 && showResult ? 26 : 19}px "Segoe UI", Arial, sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(index === 0 && showResult ? String(value ?? '—') : face.mark, center.x, center.y);
          context.restore();
        }
      }
      context.filter = 'none';
    }

    function animate(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const pitchTravel = 1 - Math.pow(1 - progress, 3.65);
      const yawTravel = 1 - Math.pow(1 - progress, 4.25);
      const instability = Math.pow(1 - progress, 1.7);
      const pitch = Math.PI * 38 * pitchTravel
        + Math.sin(progress * Math.PI * 11) * 0.24 * instability;
      const yaw = Math.PI * 30 * yawTravel - 0.24
        + Math.sin(progress * Math.PI * 8.5 + 0.7) * 0.19 * instability;
      const motionBlur = Math.pow(1 - progress, 2.8) * 1.15;
      draw(pitch, yaw, false, motionBlur);
      if (progress < 1 && rolling) frame = window.requestAnimationFrame(animate);
    }

    if (rolling) frame = window.requestAnimationFrame(animate);
    else draw(0, -0.24, true);
    return () => window.cancelAnimationFrame(frame);
  }, [rolling, value]);

  return <canvas ref={canvasRef} className="tavern-attribute-die" width="160" height="160" />;
}

function QuestChronicleTrail({ quest }: { quest: TavernQuestRun }) {
  const entries = [
    ...quest.decisions.map((decision) => ({
      key: `decision:${decision.id}`,
      stageIndex: decision.stageIndex,
      state: decision.succeeded ? 'success' : 'failure',
      label: decision.choiceTitle,
      text: decision.outcomeText,
    })),
    ...quest.puzzles.filter((puzzle) => puzzle.solved !== null && puzzle.outcomeText).map((puzzle) => ({
      key: `puzzle:${puzzle.id}`,
      stageIndex: puzzle.stageIndex,
      state: puzzle.solved ? 'success' : 'failure',
      label: puzzle.solved ? 'Odczytano ślad' : 'Ślad pozostał niepełny',
      text: puzzle.outcomeText ?? '',
    })),
  ].sort((left, right) => left.stageIndex - right.stageIndex).slice(-3);

  if (!entries.length) return null;
  return <section className="tavern-decision-trail" aria-label="Odkryte ślady tej kroniki">
    <h3>Odkryte ślady</h3>
    {entries.map((entry) => <p key={entry.key} className={entry.state}>
      <span>{entry.label}</span>{entry.text}
    </p>)}
  </section>;
}

function QuestTravelState({
  quest,
  busy,
  error,
  onUse,
}: {
  quest: TavernQuestRun;
  busy: boolean;
  error: Error | null;
  onUse: (type: TavernProvisionType) => void;
}) {
  return <section className="tavern-travel-state" aria-label="Prowiant wyprawy">
    <div className="tavern-travel-health">
      <span>Kondycja na szlaku</span>
      <HealthBar value={quest.health.current} max={quest.health.max} />
    </div>
    <div className="tavern-travel-bag">
      <span>Sakwa podróżna · użyj przed wykonaniem działania</span>
      <div>
        {quest.provisions.length ? quest.provisions.map((provision) => {
          const restoresHealth = provision.type !== 'VAEL_ANTIDOTE';
          const fullHealth = restoresHealth && quest.health.current >= quest.health.max;
          return <button
            type="button"
            key={provision.type}
            className={`provision-${provision.type.toLowerCase()}`}
            disabled={provision.remaining <= 0 || busy || fullHealth}
            onClick={() => onUse(provision.type as TavernProvisionType)}
            title={fullHealth ? 'Bohater ma już pełne zdrowie' : provision.effectLabel}
          >
            <i><b>{provision.type === 'HEALING_POTION' ? 'HP' : provision.type === 'TRAVEL_BANDAGE' ? '+' : 'V'}</b></i>
            <span><strong>{provision.name}</strong><small>{provision.effectLabel}</small></span>
            <b>×{provision.remaining}</b>
          </button>;
        }) : <p>Sakwa jest pusta. Na tym szlaku pozostaje zaufać własnej wytrzymałości.</p>}
      </div>
      {error ? <p className="tavern-quest-error">{getApiErrorMessage(error)}</p> : null}
    </div>
  </section>;
}
