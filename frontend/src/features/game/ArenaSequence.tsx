import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { RewardCascade } from '../../components/ui/RewardCascade';
import { getWeaponTypeLabel } from '../../lib/weapon-expertise';
import type { ArenaBattleResult, ArenaBattleRound, ArenaOpponent } from '../../types/game';

interface ArenaSequenceProps {
  opponent: Pick<ArenaOpponent, 'name'>;
  result: CombatSequenceResult | null;
  challenge: ArenaOpponent['challenge'];
  onComplete: () => void;
  previewFinisher?: boolean;
  presentation?: CombatSequencePresentation;
}

export type CombatSequenceResult = Omit<ArenaBattleResult, 'attacker' | 'defender'> & {
  attacker: ArenaBattleResult['attacker'] & { startingHp?: number };
  defender: ArenaBattleResult['defender'] & { startingHp?: number };
};

export interface CombatSequencePresentation {
  ariaLabel?: string;
  backgroundSrc?: string;
  header?: string;
  resultHeader?: string;
  waitingKicker?: string;
  waitingTitle?: string;
  introKicker?: string;
  introCaption?: string;
  resultKicker?: string;
  returnLabel?: string;
  controlsLabel?: string;
  opponentPortrait?: {
    src: string;
    atlasPosition?: string;
  };
  showRewards?: boolean;
  finisherDurationMs?: number;
  resultButtonDelayMs?: number;
}

type ArenaPhase = 'waiting' | 'intro' | 'clash' | 'combat' | 'finisher' | 'result';
type CombatEffect = { kind: 'hit' | 'critical' | 'parried' | 'miss'; value?: number } | null;
type CombatEffectEntry = NonNullable<CombatEffect> & { key: string };

export function ArenaSequence({ opponent, result, challenge, onComplete, previewFinisher = false, presentation }: ArenaSequenceProps) {
  const [phase, setPhase] = useState<ArenaPhase>(previewFinisher ? 'combat' : 'waiting');
  const [eventIndex, setEventIndex] = useState(() => previewFinisher && result ? result.rounds.length - 1 : -1);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const onCompleteRef = useRef(onComplete);
  const waitingStartedAtRef = useRef(Date.now());

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!result || previewFinisher) return;
    const minimumWaitingDuration = 1_050;
    const waitingDelay = Math.max(
      0,
      minimumWaitingDuration - (Date.now() - waitingStartedAtRef.current),
    );
    const prepareTimer = window.setTimeout(() => {
      setPhase('intro');
      setEventIndex(-1);
    }, waitingDelay);
    const clashTimer = window.setTimeout(() => setPhase('clash'), waitingDelay + 1_650);
    const combatTimer = window.setTimeout(() => setPhase('combat'), waitingDelay + 2_200);
    return () => {
      window.clearTimeout(prepareTimer);
      window.clearTimeout(clashTimer);
      window.clearTimeout(combatTimer);
    };
  }, [previewFinisher, result]);

  useEffect(() => {
    if (!result || phase !== 'combat') return;
    if (eventIndex >= result.rounds.length - 1) {
      const finalRound = result.rounds[result.rounds.length - 1];
      const isFinishingBlow = Boolean(finalRound && finalRound.damageDealt > 0 && finalRound.targetHpAfter === 0);
      const revealTimer = window.setTimeout(
        () => setPhase(isFinishingBlow ? 'finisher' : 'result'),
        isFinishingBlow ? 340 : 900 / speed,
      );
      return () => window.clearTimeout(revealTimer);
    }
    const roundTimer = window.setTimeout(
      () => setEventIndex((current) => current + 1),
      (eventIndex < 0 ? 500 : 820) / speed,
    );
    return () => window.clearTimeout(roundTimer);
  }, [eventIndex, phase, result, speed]);

  useEffect(() => {
    if (phase !== 'finisher') return;
    const resultTimer = window.setTimeout(() => setPhase('result'), presentation?.finisherDurationMs ?? 3_150);
    return () => window.clearTimeout(resultTimer);
  }, [phase, presentation?.finisherDurationMs]);

  const currentRound = result && eventIndex >= 0 ? result.rounds[eventIndex] : null;
  const finalRound = result?.rounds[result.rounds.length - 1] ?? null;
  const finisherTarget = finalRound && result && finalRound.targetHpAfter === 0 && finalRound.damageDealt > 0
    ? finalRound.actorId === result.attacker.combatantId ? 'opponent' : 'player'
    : null;
  const finisherCritical = finalRound?.actionType === 'CRITICAL_HIT';
  const health = useMemo(() => calculateDisplayedHealth(result, eventIndex), [eventIndex, result]);
  const playerAttacks = Boolean(result && currentRound?.actorId === result.attacker.combatantId);
  const outcome = result?.result === 'ATTACKER_WIN' ? 'victory' : result?.result === 'DEFENDER_WIN' ? 'defeat' : 'draw';
  const rewardEntryCount = result
    ? 3
      + (result.arenaProfile?.reputationChange ? 1 : 0)
      + (result.expertiseReward ? 1 : 0)
    : 3;
  const rewardInitialDelay = 350;
  const rewardStepDelay = 400;
  const arenaRankRevealDelay = rewardInitialDelay + rewardEntryCount * rewardStepDelay + 150;
  const arenaRatingProgress = result?.arenaProfile
    ? (() => {
        const threshold = result.arenaProfile.rank.threshold;
        const nextThreshold = result.arenaProfile.nextRank?.threshold ?? threshold + 1;
        const span = Math.max(1, nextThreshold - threshold);
        return {
          before: Math.max(0, Math.min(100, (result.arenaProfile.ratingBefore - threshold) / span * 100)),
          after: result.arenaProfile.nextRank
            ? Math.max(0, Math.min(100, (result.arenaProfile.ratingAfter - threshold) / span * 100))
            : 100,
        };
      })()
    : null;
  const visibleRounds = result && eventIndex >= 0
    ? result.rounds.slice(Math.max(0, eventIndex - 5), eventIndex + 1).reverse()
    : [];
  const playerEffects = useMemo(
    () => getRecentTargetEffects(result, eventIndex, 'player'),
    [eventIndex, result],
  );
  const opponentEffects = useMemo(
    () => getRecentTargetEffects(result, eventIndex, 'opponent'),
    [eventIndex, result],
  );

  function skip() {
    if (!result) return;
    setEventIndex(result.rounds.length - 1);
    setPhase('result');
  }

  const showRewards = presentation?.showRewards ?? true;

  return createPortal(<div
    className={`arena-sequence arena-phase-${phase} arena-outcome-${outcome} ${showRewards ? '' : 'arena-compact-result'}`}
    style={{ '--arena-return-delay': `${presentation?.resultButtonDelayMs ?? 2_650}ms` } as CSSProperties}
    role="dialog"
    aria-modal="true"
    aria-label={presentation?.ariaLabel ?? 'Pojedynek na arenie'}
  >
    <img className="arena-sequence-bg" src={presentation?.backgroundSrc ?? '/assets/auth-city-etheria.png'} alt="" />
    <div className="arena-sequence-shade" />
    <div className="arena-sequence-dust" aria-hidden="true"><i /><i /><i /><i /></div>
    <header className="arena-sequence-header"><BrandLogo /><span>{phase === 'result' ? presentation?.resultHeader ?? 'Wyrok areny' : presentation?.header ?? 'Krąg stali · pojedynek treningowy'}</span></header>

    {phase === 'waiting' ? <main className="arena-waiting">
      <p>{presentation?.waitingKicker ?? 'Żelazne wrota zamykają się za bohaterami'}</p>
      <h1>{presentation?.waitingTitle ?? 'Herold przywołuje walczących…'}</h1>
      <div className="arena-waiting-line"><span /></div>
    </main> : null}

    {(phase === 'intro' || phase === 'clash') && result ? <main className={`arena-intro-screen ${phase === 'clash' ? 'arena-intro-clash' : ''}`}>
      <ArenaFighter figure="player" name={result.attacker.name} level={result.attacker.level} frame="hero" />
      <div className="arena-intro-vs"><small>{presentation?.introKicker ?? 'Pojedynek'}</small><strong>VS</strong><span>{presentation?.introCaption ?? 'Niech przemówi stal'}</span></div>
      <ArenaFighter figure="opponent" name={result.defender.name} level={result.defender.level} frame={challengeFrame(challenge)} portrait={presentation?.opponentPortrait} />
    </main> : null}

    {(phase === 'combat' || phase === 'finisher') && result ? <main className={`arena-combat-screen ${phase === 'finisher' ? `arena-finisher-active arena-finisher-target-${finisherTarget ?? 'none'} ${finisherCritical ? 'arena-finisher-critical' : ''}` : currentRound ? `arena-action-${currentRound.actionType.toLowerCase()} ${playerAttacks ? 'arena-attacker-active' : 'arena-defender-active'}` : ''}`}>
      <div className="arena-fight-stage">
        <ArenaFighter
          figure="player"
          name={result.attacker.name}
          level={result.attacker.level}
          hp={health.attacker}
          maxHp={result.attacker.maxHp}
          active={phase === 'combat' && playerAttacks}
          frame="hero"
          effects={playerEffects}
          defeated={phase === 'finisher' && finisherTarget === 'player'}
          finisherCritical={finisherCritical}
        />
        <div className="arena-center-stage">
          <div className="arena-impact" aria-hidden="true"><span /><i>{currentRound?.actionType === 'PARRIED' ? '×' : ''}</i></div>
          <div className="arena-combat-log" aria-live="polite">
            {visibleRounds.map((round, index) => <div className="arena-combat-log-entry" key={round.id ?? `${round.roundNumber}-${round.actorId}-${eventIndex - index}`}>
              <span>Runda {round.roundNumber}</span>
              <strong>{describeAction(round, round.actorId === result.attacker.combatantId, result)}</strong>
            </div>)}
          </div>
        </div>
        <ArenaFighter
          figure="opponent"
          name={result.defender.name}
          level={result.defender.level}
          hp={health.defender}
          maxHp={result.defender.maxHp}
          active={phase === 'combat' && Boolean(currentRound && !playerAttacks)}
          frame={challengeFrame(challenge)}
          portrait={presentation?.opponentPortrait}
          effects={opponentEffects}
          defeated={phase === 'finisher' && finisherTarget === 'opponent'}
          finisherCritical={finisherCritical}
        />
      </div>
    </main> : null}

    {phase === 'result' && result ? <main className={`arena-result-screen arena-result-${outcome}`}>
      <p>{presentation?.resultKicker ?? 'Piasek areny wydał swój wyrok'}</p>
      <h1>{outcome === 'victory' ? 'ZWYCIĘSTWO' : outcome === 'defeat' ? 'PORAŻKA' : 'REMIS'}</h1>
      <h2 className="arena-result-duel">
        <strong>{result.attacker.name}</strong>
        <span>VS</span>
        <strong>{opponent.name}</strong>
      </h2>
      {showRewards ? <RewardCascade
        className={`arena-reward-cascade arena-reward-count-${rewardEntryCount}`}
        initialDelay={rewardInitialDelay}
        stepDelay={rewardStepDelay}
        entries={[
          { kind: 'gold', label: 'Złoto', value: outcome === 'victory' ? result.goldReward : 0 },
          { kind: 'xp', label: 'Doświadczenie', value: result.expReward },
          ...(result.arenaProfile?.reputationChange ? [{
            kind: 'reputation' as const,
            label: 'Reputacja',
            value: Math.abs(result.arenaProfile.reputationChange),
            prefix: result.arenaProfile.reputationChange > 0 ? '+' : '−',
            suffix: ' REP',
          }] : []),
          ...(result.expertiseReward ? [{
            kind: 'expertise' as const,
            label: `Biegłość: ${getWeaponTypeLabel(result.expertiseReward.weaponType)}`,
            value: result.expertiseReward.experienceGained,
            prefix: '+',
            suffix: ' EXP',
            detail: result.expertiseReward.leveledUp
              ? <>Awans <b>Poziom {result.expertiseReward.levelAfter}</b></>
              : undefined,
          }] : []),
          { kind: 'rounds', label: 'Rozegrane rundy', value: result.rounds[result.rounds.length - 1]?.roundNumber ?? 0 },
        ]}
      /> : null}
      {showRewards && result.arenaProfile ? <div
        className="arena-result-rating arena-result-rating-cascade"
        style={{
          '--arena-rank-delay': `${arenaRankRevealDelay}ms`,
          '--arena-rating-before': `${arenaRatingProgress?.before ?? 0}%`,
          '--arena-rating-after': `${arenaRatingProgress?.after ?? 100}%`,
        } as CSSProperties}
      >
        <span>{result.arenaProfile.rank.title}</span>
        <strong className="game-number">
          <AnimatedArenaRating
            from={result.arenaProfile.ratingBefore}
            to={result.arenaProfile.ratingAfter}
            delay={arenaRankRevealDelay + 700}
          />
          <em className={result.arenaProfile.ratingChange >= 0 ? 'is-positive' : 'is-negative'}>
            {result.arenaProfile.ratingChange >= 0 ? '+' : ''}{result.arenaProfile.ratingChange}
          </em>
        </strong>
        <div className="arena-rating-ornament">
          <div className="arena-rank-wing arena-rank-wing-left" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
          <div className="arena-rating-progress" aria-label={`Postęp rangi: ${Math.round(arenaRatingProgress?.after ?? 100)}%`}>
            <i><b /></i>
          </div>
          <div className="arena-rank-wing arena-rank-wing-right" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
        </div>
      </div> : null}
      <button type="button" className="arena-result-return" onClick={() => onCompleteRef.current()}>{presentation?.returnLabel ?? 'Opuść arenę'}</button>
    </main> : null}

    {phase === 'combat' ? <footer className="arena-sequence-controls">
      <span>{presentation?.controlsLabel ?? 'Przebieg walki jest odtwarzany z kroniki rund'}</span>
      <div><button type="button" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>Prędkość ×{speed}</button><button type="button" onClick={skip}>Pomiń walkę</button></div>
    </footer> : null}
  </div>, document.body);
}

function AnimatedArenaRating({
  from,
  to,
  delay,
  duration = 1_450,
}: {
  from: number;
  to: number;
  delay: number;
  duration?: number;
}) {
  const [displayedValue, setDisplayedValue] = useState(from);

  useEffect(() => {
    let animationFrame = 0;
    let startedAt = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delayTimer = window.setTimeout(() => {
      if (reducedMotion) {
        setDisplayedValue(to);
        return;
      }
      const animate = (timestamp: number) => {
        if (!startedAt) startedAt = timestamp;
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setDisplayedValue(Math.round(from + (to - from) * easedProgress));
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      };
      animationFrame = window.requestAnimationFrame(animate);
    }, delay);
    return () => {
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, from, to]);

  return <>{displayedValue}</>;
}

interface ArenaFighterProps {
  figure: 'player' | 'opponent';
  name: string;
  level: number;
  hp?: number;
  maxHp?: number;
  active?: boolean;
  frame: 'hero' | 'favorable' | 'even' | 'demanding';
  effects?: CombatEffectEntry[];
  defeated?: boolean;
  finisherCritical?: boolean;
  portrait?: CombatSequencePresentation['opponentPortrait'];
}

function ArenaFighter({ figure, name, level, hp, maxHp, active, frame, effects = [], defeated = false, finisherCritical = false, portrait }: ArenaFighterProps) {
  const hpPercent = hp !== undefined && maxHp ? Math.max(0, Math.min(100, hp / maxHp * 100)) : 100;
  const latestEffect = effects[effects.length - 1];
  const portraitSrc = portrait?.src ?? (figure === 'player' ? '/assets/hero-portrait.png' : '/assets/hero-portrait-chest-elite.png');
  return <article className={`arena-fighter arena-fighter-${figure} arena-frame-${frame} ${active ? 'arena-fighter-active' : ''} ${latestEffect?.kind === 'critical' && !defeated ? 'arena-critical-target' : ''} ${defeated ? 'arena-fighter-defeated' : ''} ${defeated && finisherCritical ? 'arena-fighter-defeated-critical' : ''}`}>
    <div className="arena-fighter-figure">
      {portrait?.atlasPosition ? <div
        className="arena-fighter-atlas-portrait"
        style={{ backgroundImage: `url('${portraitSrc}')`, backgroundPosition: portrait.atlasPosition }}
        role="img"
        aria-label={name}
      /> : <img src={portraitSrc} alt="" />}
      <div className="arena-portrait-ornaments" aria-hidden="true">
        <i className="arena-portrait-corner arena-portrait-corner-tl" />
        <i className="arena-portrait-corner arena-portrait-corner-tr" />
        <i className="arena-portrait-corner arena-portrait-corner-br" />
        <i className="arena-portrait-corner arena-portrait-corner-bl" />
        <i className="arena-portrait-crest"><span /></i>
        <i className="arena-portrait-rune">✦</i>
      </div>
      {defeated ? <div className="arena-execution-finisher" aria-hidden="true">
        <div className="arena-steel-finisher">
          <div className="arena-steel-speedlines">
            {Array.from({ length: 7 }, (_, index) => <i key={`steel-line-${index}`} />)}
          </div>
          <span className="arena-steel-impact-ring" />
          <div className="arena-steel-sparks">
            {Array.from({ length: 12 }, (_, index) => <i key={`steel-spark-${index}`} />)}
          </div>
          <div className="arena-steel-debris">
            {Array.from({ length: 7 }, (_, index) => <i key={`steel-debris-${index}`} />)}
          </div>
        </div>
        <div className="arena-execution-slice">
          <span />
          {finisherCritical ? <span /> : null}
        </div>
        <div className="arena-portrait-split">
          {portrait?.atlasPosition ? <>
            <i className="arena-portrait-piece arena-portrait-piece-atlas arena-portrait-piece-upper" style={{ backgroundImage: `url('${portraitSrc}')`, backgroundPosition: portrait.atlasPosition }} />
            <i className="arena-portrait-piece arena-portrait-piece-atlas arena-portrait-piece-lower" style={{ backgroundImage: `url('${portraitSrc}')`, backgroundPosition: portrait.atlasPosition }} />
          </> : <><img className="arena-portrait-piece arena-portrait-piece-upper" src={portraitSrc} alt="" />
          <img className="arena-portrait-piece arena-portrait-piece-lower" src={portraitSrc} alt="" /></>}
        </div>
        <div className="arena-execution-embers">
          {Array.from({ length: 10 }, (_, index) => <i key={`execution-ember-${index}`} />)}
        </div>
      </div> : null}
    </div>
    <div className="arena-combat-float-stack">
      {effects.map((effect) => <CombatFloat key={effect.key} effect={effect} />)}
    </div>
    <div className="arena-fighter-hud">
      <div className="arena-fighter-identity"><span>LVL {level}</span><h2>{name}</h2></div>
      {hp !== undefined && maxHp ? <div className="arena-fighter-health"><div><span style={{ width: `${hpPercent}%` }} /></div><small className="game-number">{Math.max(0, hp)} / {maxHp} HP</small></div> : null}
    </div>
  </article>;
}

function CombatFloat({ effect }: { effect: NonNullable<CombatEffect> }) {
  const label = effect.kind === 'critical'
    ? `KRYTYK  −${effect.value}`
    : effect.kind === 'hit'
      ? `−${effect.value}`
      : effect.kind === 'parried'
        ? 'PAROWANIE'
        : 'PUDŁO';
  return <div className={`arena-combat-float arena-combat-float-${effect.kind}`} aria-live="assertive">{label}</div>;
}

function getCombatEffect(round: ArenaBattleRound | null): CombatEffect {
  if (!round) return null;
  switch (round.actionType) {
    case 'CRITICAL_HIT': return { kind: 'critical', value: round.damageDealt };
    case 'PARRIED': return { kind: 'parried' };
    case 'MISS': return { kind: 'miss' };
    default: return { kind: 'hit', value: round.damageDealt };
  }
}

function getRecentTargetEffects(
  result: CombatSequenceResult | null,
  eventIndex: number,
  target: 'player' | 'opponent',
): CombatEffectEntry[] {
  if (!result || eventIndex < 0) return [];
  return result.rounds
    .slice(0, eventIndex + 1)
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => target === 'player'
      ? round.actorId === result.defender.combatantId
      : round.actorId === result.attacker.combatantId)
    .slice(-3)
    .map(({ round, index }) => ({
      ...getCombatEffect(round)!,
      key: round.id ?? `${index}-${round.actorId}-${round.actionType}`,
    }));
}

function challengeFrame(challenge: ArenaOpponent['challenge']): ArenaFighterProps['frame'] {
  if (challenge === 'KORZYSTNY') return 'favorable';
  if (challenge === 'WYMAGAJĄCY') return 'demanding';
  return 'even';
}

function calculateDisplayedHealth(result: CombatSequenceResult | null, eventIndex: number) {
  if (!result || eventIndex < 0) return { attacker: result?.attacker.startingHp ?? result?.attacker.maxHp ?? 0, defender: result?.defender.startingHp ?? result?.defender.maxHp ?? 0 };
  let attacker = result.attacker.startingHp ?? result.attacker.maxHp;
  let defender = result.defender.startingHp ?? result.defender.maxHp;
  for (const round of result.rounds.slice(0, eventIndex + 1)) {
    if (round.actorId === result.attacker.combatantId) {
      defender = Math.max(0, defender - round.damageDealt);
    } else {
      attacker = Math.max(0, attacker - round.damageDealt);
    }
  }
  return { attacker, defender };
}

function describeAction(round: ArenaBattleRound | null, attackerActive: boolean, result: CombatSequenceResult) {
  if (!round) return 'Wojownicy szukają pierwszego otwarcia…';
  const actor = attackerActive ? result.attacker.name : result.defender.name;
  switch (round.actionType) {
    case 'CRITICAL_HIT': return `${actor} zadaje druzgocący cios za ${round.damageDealt} obrażeń!`;
    case 'PARRIED': return `${actor} uderza, lecz ostrze zostaje sparowane.`;
    case 'MISS': return `${actor} atakuje — cios przecina jedynie powietrze.`;
    default: return `${actor} trafia przeciwnika za ${round.damageDealt} obrażeń.`;
  }
}
