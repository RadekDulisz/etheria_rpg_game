import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import type { ArenaBattleResult, ArenaBattleRound, ArenaOpponent } from '../../types/game';

interface ArenaSequenceProps {
  opponent: ArenaOpponent;
  result: ArenaBattleResult | null;
  onComplete: () => void;
}

type ArenaPhase = 'waiting' | 'intro' | 'combat' | 'result';

export function ArenaSequence({ opponent, result, onComplete }: ArenaSequenceProps) {
  const [phase, setPhase] = useState<ArenaPhase>('waiting');
  const [eventIndex, setEventIndex] = useState(-1);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!result) return;
    const prepareTimer = window.setTimeout(() => {
      setPhase('intro');
      setEventIndex(-1);
    }, 0);
    const combatTimer = window.setTimeout(() => setPhase('combat'), 1_900);
    return () => {
      window.clearTimeout(prepareTimer);
      window.clearTimeout(combatTimer);
    };
  }, [result]);

  useEffect(() => {
    if (!result || phase !== 'combat') return;
    if (eventIndex >= result.rounds.length - 1) {
      const revealTimer = window.setTimeout(() => setPhase('result'), 850 / speed);
      return () => window.clearTimeout(revealTimer);
    }
    const roundTimer = window.setTimeout(() => setEventIndex((current) => current + 1), (eventIndex < 0 ? 500 : 760) / speed);
    return () => window.clearTimeout(roundTimer);
  }, [eventIndex, phase, result, speed]);

  const currentRound = result && eventIndex >= 0 ? result.rounds[eventIndex] : null;
  const health = useMemo(() => calculateDisplayedHealth(result, eventIndex), [eventIndex, result]);
  const attackerActive = Boolean(result && currentRound?.actorId === result.attacker.combatantId);
  const outcome = result?.result === 'ATTACKER_WIN' ? 'victory' : result?.result === 'DEFENDER_WIN' ? 'defeat' : 'draw';
  const visibleRounds = result && eventIndex >= 0
    ? result.rounds.slice(Math.max(0, eventIndex - 4), eventIndex + 1).reverse()
    : [];

  function skip() {
    if (!result) return;
    setEventIndex(result.rounds.length - 1);
    setPhase('result');
  }

  return createPortal(<div className={`arena-sequence arena-phase-${phase} arena-outcome-${outcome}`} role="dialog" aria-modal="true" aria-label="Pojedynek na arenie">
    <img className="arena-sequence-bg" src="/assets/auth-city-etheria.png" alt="" />
    <div className="arena-sequence-shade" />
    <div className="arena-sequence-dust" aria-hidden="true"><i /><i /><i /><i /></div>
    <header className="arena-sequence-header"><BrandLogo /><span>{phase === 'result' ? 'Wyrok areny' : 'Krąg stali · pojedynek treningowy'}</span></header>

    {phase === 'waiting' ? <main className="arena-waiting">
      <p>Żelazne wrota zamykają się za bohaterami</p>
      <h1>Herold przywołuje walczących…</h1>
      <div className="arena-waiting-line"><span /></div>
    </main> : null}

    {phase === 'intro' && result ? <main className="arena-intro-screen">
      <ArenaFighter figure="player" name={result.attacker.name} level={result.attacker.level} />
      <div className="arena-intro-vs"><small>Pojedynek</small><strong>VS</strong><span>Niech przemówi stal</span></div>
      <ArenaFighter figure="opponent" name={result.defender.name} level={result.defender.level} />
    </main> : null}

    {phase === 'combat' && result ? <main className={`arena-combat-screen ${currentRound ? `arena-action-${currentRound.actionType.toLowerCase()} ${attackerActive ? 'arena-attacker-active' : 'arena-defender-active'}` : ''}`}>
      <div className="arena-fight-stage">
        <ArenaFighter figure="player" name={result.attacker.name} level={result.attacker.level} hp={health.attacker} maxHp={result.attacker.maxHp} active={attackerActive} />
        <div className="arena-impact" aria-hidden="true"><span /><i>{currentRound?.actionType === 'PARRIED' ? '×' : ''}</i></div>
        <ArenaFighter figure="opponent" name={result.defender.name} level={result.defender.level} hp={health.defender} maxHp={result.defender.maxHp} active={Boolean(currentRound && !attackerActive)} />
      </div>
      <div className="arena-combat-log" aria-live="polite">
        {visibleRounds.map((round, index) => <div className="arena-combat-log-entry" key={round.id ?? `${round.roundNumber}-${round.actorId}-${eventIndex - index}`}>
          <span>Runda {round.roundNumber}</span>
          <strong>{describeAction(round, round.actorId === result.attacker.combatantId, result)}</strong>
        </div>)}
      </div>
    </main> : null}

    {phase === 'result' && result ? <main className={`arena-result-screen arena-result-${outcome}`}>
      <p>Piasek areny wydał swój wyrok</p>
      <h1>{outcome === 'victory' ? 'ZWYCIĘSTWO' : outcome === 'defeat' ? 'PORAŻKA' : 'REMIS'}</h1>
      <h2>{result.attacker.name} <span>kontra</span> {opponent.name}</h2>
      <div className="arena-result-rewards">
        <article><span>Złoto</span><strong>{outcome === 'victory' ? <CurrencyAmount value={result.goldReward} compact /> : '0'}</strong></article>
        <article><span>Doświadczenie</span><strong>{result.expReward} XP</strong></article>
        <article><span>Rozegrane rundy</span><strong>{result.rounds[result.rounds.length - 1]?.roundNumber ?? 0}</strong></article>
      </div>
      <button type="button" className="arena-result-return" onClick={() => onCompleteRef.current()}>Opuść arenę</button>
    </main> : null}

    {phase === 'combat' ? <footer className="arena-sequence-controls">
      <span>Przebieg walki jest odtwarzany z kroniki rund</span>
      <div><button type="button" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>Prędkość ×{speed}</button><button type="button" onClick={skip}>Pomiń walkę</button></div>
    </footer> : null}
  </div>, document.body);
}

interface ArenaFighterProps {
  figure: 'player' | 'opponent';
  name: string;
  level: number;
  hp?: number;
  maxHp?: number;
  active?: boolean;
}

function ArenaFighter({ figure, name, level, hp, maxHp, active }: ArenaFighterProps) {
  const hpPercent = hp !== undefined && maxHp ? Math.max(0, Math.min(100, hp / maxHp * 100)) : 100;
  return <article className={`arena-fighter arena-fighter-${figure} ${active ? 'arena-fighter-active' : ''}`}>
    <div className="arena-fighter-figure"><img src={figure === 'player' ? '/assets/hero-portrait.png' : '/assets/hero-portrait-chest-elite.png'} alt="" /></div>
    <div className="arena-fighter-identity"><span>LVL {level}</span><h2>{name}</h2></div>
    {hp !== undefined && maxHp ? <div className="arena-fighter-health"><div><span style={{ width: `${hpPercent}%` }} /></div><small className="game-number">{Math.max(0, hp)} / {maxHp} HP</small></div> : null}
  </article>;
}

function calculateDisplayedHealth(result: ArenaBattleResult | null, eventIndex: number) {
  if (!result || eventIndex < 0) return { attacker: result?.attacker.maxHp ?? 0, defender: result?.defender.maxHp ?? 0 };
  let attacker = result.attacker.maxHp;
  let defender = result.defender.maxHp;
  for (const round of result.rounds.slice(0, eventIndex + 1)) {
    if (round.actorId === result.attacker.combatantId) {
      attacker = round.actorHpAfter;
      defender = round.targetHpAfter;
    } else {
      defender = round.actorHpAfter;
      attacker = round.targetHpAfter;
    }
  }
  return { attacker, defender };
}

function describeAction(round: ArenaBattleRound | null, attackerActive: boolean, result: ArenaBattleResult) {
  if (!round) return 'Wojownicy szukają pierwszego otwarcia…';
  const actor = attackerActive ? result.attacker.name : result.defender.name;
  switch (round.actionType) {
    case 'CRITICAL_HIT': return `${actor} zadaje druzgocący cios za ${round.damageDealt} obrażeń!`;
    case 'PARRIED': return `${actor} uderza, lecz ostrze zostaje sparowane.`;
    case 'MISS': return `${actor} atakuje — cios przecina jedynie powietrze.`;
    default: return `${actor} trafia przeciwnika za ${round.damageDealt} obrażeń.`;
  }
}
