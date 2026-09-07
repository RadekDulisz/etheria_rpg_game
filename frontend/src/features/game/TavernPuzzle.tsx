import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { solveTavernPuzzle } from '../../api/tavern.api';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { TavernQuestPuzzleStage, TavernQuestRun } from '../../types/game';

interface TavernPuzzleProps {
  stage: TavernQuestPuzzleStage;
  onRetry: (quest: TavernQuestRun) => void;
  onAdvance: (quest: TavernQuestRun) => void;
  journeyContent?: ReactNode;
}

export function TavernPuzzle({ stage, onRetry, onAdvance, journeyContent }: TavernPuzzleProps) {
  const [selection, setSelection] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<{ solved: boolean; text: string } | null>(null);
  const mutation = useMutation({
    mutationFn: solveTavernPuzzle,
    onSuccess: (nextQuest) => {
      const progress = nextQuest.puzzles[nextQuest.puzzles.length - 1];
      if (nextQuest.currentStage?.type === 'PUZZLE' && nextQuest.currentStage.index === stage.index) {
        setSelection([]);
        onRetry(nextQuest);
        return;
      }
      setOutcome({ solved: Boolean(progress?.solved), text: progress?.outcomeText ?? 'Mechanizm zamilkł.' });
      window.setTimeout(() => onAdvance(nextQuest), 850);
    },
  });

  function select(id: string) {
    if (mutation.isPending || outcome) return;
    if (stage.kind !== 'SEQUENCE') {
      setSelection([id]);
      return;
    }
    setSelection((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= stage.requiredSelections) return current;
      return [...current, id];
    });
  }

  const canSubmit = selection.length === stage.requiredSelections && !mutation.isPending && !outcome;
  const isMillMechanism = stage.puzzleKey === 'mill-gears';
  const isWaterRite = stage.puzzleKey === 'vael-water-rite';
  const isCustomMechanism = isMillMechanism || isWaterRite;

  return <section className={`tavern-puzzle is-${stage.kind.toLowerCase()} ${outcome ? outcome.solved ? 'is-solved' : 'is-failed' : ''}`}>
    <div className="tavern-puzzle-heading">
      <p className="tavern-stage-kicker">{stage.kicker}</p>
      <h1>{stage.title}</h1>
      <p>{stage.narrative}</p>
    </div>

    {journeyContent}

    <div className="tavern-puzzle-table">
      <header>
        <span>{isMillMechanism ? 'Hamulec nocnego żarna' : isWaterRite ? 'Ołtarz Trzech Fundamentów' : stage.kind === 'SEQUENCE' ? 'Mechanizm starej pieczęci' : stage.kind === 'TESTIMONY' ? 'Zeznania na szlaku' : 'Ślady i poszlaki'}</span>
        <strong>Próba {Math.min(stage.attempts + 1, stage.maxAttempts)} z {stage.maxAttempts}</strong>
      </header>
      <blockquote>{stage.prompt}</blockquote>
      <p className="tavern-puzzle-instruction">{isMillMechanism
        ? 'To próba zręczności. Zatrzymaj jasny znacznik w złotym polu znajdującym się u góry każdego koła.'
        : isWaterRite
          ? 'Obracaj pierścienie, aż wszystkie trzy świetliste nacięcia znajdą się pod srebrnym znacznikiem u góry ołtarza.'
          : stage.instruction}</p>

      {isMillMechanism ? <MillMechanism
        key={`${stage.index}-${stage.attempts}`}
        disabled={mutation.isPending || Boolean(outcome)}
        resolving={mutation.isPending}
        onResolve={(succeeded) => mutation.mutate(succeeded ? ['water', 'fire', 'ash'] : ['grain', 'fire', 'ash'])}
      /> : isWaterRite ? <WaterRiteMechanism
        key={`${stage.index}-${stage.attempts}`}
        disabled={mutation.isPending || Boolean(outcome)}
        resolving={mutation.isPending}
        onResolve={(succeeded) => mutation.mutate(succeeded ? ['earth', 'water', 'memory'] : ['crown', 'water', 'memory'])}
      /> : stage.kind === 'SEQUENCE' ? <div className="tavern-puzzle-sequence" aria-label="Wybrana kolejność">
        {Array.from({ length: stage.requiredSelections }, (_, index) => {
          const option = stage.options.find((entry) => entry.id === selection[index]);
          return <button type="button" key={index} className={option ? 'filled' : ''} onClick={() => option ? select(option.id) : undefined}>
            <small>{index + 1}</small><strong>{option?.symbol ?? '—'}</strong><span>{option?.label ?? 'Wybierz znak'}</span>
          </button>;
        })}
      </div> : null}

      {!isCustomMechanism ? <div className="tavern-puzzle-options">
        {stage.options.map((option) => {
          const order = selection.indexOf(option.id);
          return <button type="button" key={option.id} className={order >= 0 ? 'selected' : ''} onClick={() => select(option.id)} disabled={mutation.isPending || Boolean(outcome)}>
            <i>{order >= 0 ? stage.kind === 'SEQUENCE' ? order + 1 : '✓' : option.symbol ?? '?'}</i>
            <span><strong>{option.label}</strong><small>{option.detail}</small></span>
          </button>;
        })}
      </div> : null}

      {stage.feedback ? <div className="tavern-puzzle-feedback"><strong>Pierwsza próba nie otworzyła drogi</strong><p>{stage.feedback}</p></div> : null}
      {stage.hint ? <p className="tavern-puzzle-hint"><span>Wskazówka Miry</span>{stage.hint}</p> : null}
      {outcome ? <div className="tavern-puzzle-outcome"><strong>{outcome.solved ? 'WZÓR ODKRYTY' : 'PIECZĘĆ ODRZUCA ODPOWIEDŹ'}</strong><p>{outcome.text}</p></div> : null}

      {!isCustomMechanism ? <footer>
        {stage.kind === 'SEQUENCE' && selection.length ? <button type="button" className="secondary" onClick={() => setSelection([])} disabled={mutation.isPending || Boolean(outcome)}>Wyczyść układ</button> : <span />}
        <button type="button" disabled={!canSubmit} onClick={() => mutation.mutate(selection)}>{mutation.isPending ? 'Pieczęć odpowiada…' : 'Potwierdź odpowiedź'}</button>
      </footer> : null}
      {mutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(mutation.error)}</p> : null}
    </div>
  </section>;
}

const WATER_RITE_RINGS = [
  { id: 'earth', label: 'Ziemia', className: 'is-earth' },
  { id: 'water', label: 'Woda', className: 'is-water' },
  { id: 'memory', label: 'Pamięć', className: 'is-memory' },
] as const;
const WATER_RITE_STEPS = 8;

function WaterRiteMechanism({ disabled, resolving, onResolve }: { disabled: boolean; resolving: boolean; onResolve: (succeeded: boolean) => void }) {
  const [positions, setPositions] = useState(() => WATER_RITE_RINGS.map(() => 1 + Math.floor(Math.random() * (WATER_RITE_STEPS - 1))));
  const aligned = positions.every((position) => position === 0);

  function turnRing(index: number, direction: -1 | 1) {
    if (disabled) return;
    setPositions((current) => current.map((position, ringIndex) => ringIndex === index
      ? (position + direction + WATER_RITE_STEPS) % WATER_RITE_STEPS
      : position));
  }

  return <div className={`water-rite ${aligned ? 'is-aligned' : ''}`}>
    <div className="water-rite-altar" aria-label="Trzy pierścienie ołtarza Vael">
      <span className="water-rite-target" aria-hidden="true"><i /></span>
      {WATER_RITE_RINGS.map((ring, index) => <span
        key={ring.id}
        className={`water-rite-ring ${ring.className}`}
        style={{ '--rite-angle': `${positions[index] * 45}deg` } as CSSProperties}
        aria-hidden="true"
      ><i /></span>)}
      <span className="water-rite-core"><i /></span>
    </div>

    <div className="water-rite-controls">
      {WATER_RITE_RINGS.map((ring, index) => <div key={ring.id} className={positions[index] === 0 ? 'is-aligned' : ''}>
        <button type="button" onClick={() => turnRing(index, -1)} disabled={disabled} aria-label={`Obróć pierścień ${ring.label} w lewo`}>‹</button>
        <span><small>PIERŚCIEŃ {index + 1}</small><strong>{ring.label}</strong><i>{positions[index] === 0 ? 'W OSI' : 'OBRÓĆ'}</i></span>
        <button type="button" onClick={() => turnRing(index, 1)} disabled={disabled} aria-label={`Obróć pierścień ${ring.label} w prawo`}>›</button>
      </div>)}
    </div>

    <p>{aligned ? 'Trzy nacięcia tworzą jedną linię. Woda pod ołtarzem uspokaja się.' : 'Każdy pierścień porusza inną warstwę dawnego obrzędu. Ustaw wszystkie nacięcia na godzinie dwunastej.'}</p>
    <button type="button" className={`water-rite-submit ${aligned ? 'is-ready' : ''}`} disabled={disabled || !aligned} onClick={() => onResolve(true)}>{resolving ? 'Ołtarz odpowiada…' : aligned ? 'Dopełnij rytuału' : 'Najpierw wyrównaj pierścienie'}</button>
  </div>;
}

const MILL_WHEELS = [
  { id: 'water', name: 'Koło wodne', mark: 'I', minSpeed: 94, maxSpeed: 122 },
  { id: 'fire', name: 'Oś paleniska', mark: 'II', minSpeed: 112, maxSpeed: 148 },
  { id: 'ash', name: 'Zasuwa popiołu', mark: 'III', minSpeed: 132, maxSpeed: 174 },
] as const;
const MILL_HIT_TOLERANCE = 22;
const MILL_SPIN_UP_TIME = 950;

function MillMechanism({ disabled, resolving, onResolve }: { disabled: boolean; resolving: boolean; onResolve: (succeeded: boolean) => void }) {
  const startedAt = useRef(0);
  const clickGuard = useRef(false);
  const [wheelMotion] = useState(() => MILL_WHEELS.map((wheel) => ({
    offset: randomMillOffset(),
    speed: randomMillSpeed(wheel.minSpeed, wheel.maxSpeed),
  })));
  const [active, setActive] = useState(0);
  const [canStop, setCanStop] = useState(false);
  const [angles, setAngles] = useState<number[]>(() => wheelMotion.map((motion) => motion.offset));
  const [locked, setLocked] = useState<Array<'success' | 'failure' | null>>(MILL_WHEELS.map(() => null));

  useEffect(() => {
    if (active >= MILL_WHEELS.length) return;
    clickGuard.current = true;
    const timer = window.setTimeout(() => {
      clickGuard.current = false;
      setCanStop(true);
    }, MILL_SPIN_UP_TIME);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    let frame = 0;
    startedAt.current = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startedAt.current) / 1000;
      setAngles((current) => current.map((angle, index) => locked[index] ? angle : normalizeAngle(wheelMotion[index].offset + elapsed * wheelMotion[index].speed)));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [locked, wheelMotion]);

  function stopWheel() {
    if (disabled || !canStop || clickGuard.current || active >= MILL_WHEELS.length) return;
    clickGuard.current = true;
    setCanStop(false);
    const distance = Math.min(angles[active], 360 - angles[active]);
    const result = distance <= MILL_HIT_TOLERANCE ? 'success' : 'failure';
    setLocked((current) => current.map((value, index) => index === active ? result : value));
    window.setTimeout(() => setActive((value) => value + 1), 360);
  }

  const finished = active >= MILL_WHEELS.length;
  const succeeded = finished && locked.every((entry) => entry === 'success');

  return <div className={`mill-mechanism ${finished ? succeeded ? 'is-ready' : 'is-damaged' : ''}`}>
    <div className="mill-mechanism-header">
      <div><small>Awaryjny napęd spichlerza</small><strong>{finished ? succeeded ? 'Rytm został przerwany' : 'Mechanizm stawia opór' : `Zatrzymaj element ${active + 1} z ${MILL_WHEELS.length}`}</strong></div>
      <span>{locked.filter(Boolean).length}/{MILL_WHEELS.length}</span>
    </div>
    <div className="mill-wheel-bank" aria-label="Mechanizm trzech kół młyna">
      {MILL_WHEELS.map((wheel, index) => {
        const state = locked[index];
        const distance = Math.min(angles[index], 360 - angles[index]);
        const inZone = index === active && distance <= MILL_HIT_TOLERANCE;
        return <div key={wheel.id} className={`mill-wheel-station ${index === active ? 'is-active' : ''} ${inZone ? 'is-in-zone' : ''} ${state ? `is-${state}` : ''}`}>
          <div className="mill-wheel-target" aria-hidden="true" />
          <button
            type="button"
            className="mill-wheel"
            style={{ '--wheel-angle': `${angles[index]}deg` } as CSSProperties}
            aria-label={index === active ? `Zatrzymaj: ${wheel.name}` : wheel.name}
            disabled={disabled || !canStop || index !== active}
            onClick={stopWheel}
          >
            <span className="mill-wheel-teeth" />
            <span className="mill-wheel-lock-mark" aria-hidden="true"><i /></span>
            <b>{wheel.mark}</b>
          </button>
          <strong>{wheel.name}</strong>
          <small>{state === 'success' ? 'ZABLOKOWANE' : state === 'failure' ? 'NIETRAFIONE' : index === active && !canStop ? 'MECHANIZM SIĘ ROZPĘDZA' : inZone ? 'TERAZ — ZATRZYMAJ' : index === active ? 'OBSERWUJ ZNACZNIK' : 'OCZEKUJE'}</small>
        </div>;
      })}
    </div>
    <div className="mill-mechanism-meter"><span style={{ width: `${Math.min(100, active / MILL_WHEELS.length * 100)}%` }} /></div>
    <p>{finished ? succeeded ? 'Wszystkie zapadki odpowiadają rytmowi nocnej zmiany. Możesz bezpiecznie zatrzymać żarno.' : 'Jedna z zapadek została zatrzymana w niewłaściwym położeniu. Uruchomienie hamulca może obudzić pełne Echo Grumara.' : 'Obserwuj obracający się znacznik. Kliknij, gdy znajdzie się w złotym polu u góry koła.'}</p>
    {finished ? <button type="button" className="mill-mechanism-submit" disabled={disabled} onClick={() => onResolve(succeeded)}>{resolving ? 'Żarno odpowiada…' : 'Uruchom hamulec żarna'}</button> : <button type="button" className={`mill-mechanism-stop ${canStop && Math.min(angles[active], 360 - angles[active]) <= MILL_HIT_TOLERANCE ? 'is-ready' : ''}`} disabled={disabled || !canStop} onClick={stopWheel}>{!canStop ? 'Koło nabiera rozpędu…' : Math.min(angles[active], 360 - angles[active]) <= MILL_HIT_TOLERANCE ? 'Zablokuj teraz' : `Zatrzymaj: ${MILL_WHEELS[active]?.name ?? 'mechanizm'}`}</button>}
  </div>;
}

function randomMillOffset(): number {
  // Każda próba zaczyna się poza polem celu, ale nigdy w tym samym miejscu.
  return 58 + Math.random() * 244;
}

function randomMillSpeed(min: number, max: number): number {
  const speed = min + Math.random() * (max - min);
  return Math.random() < .5 ? -speed : speed;
}

function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360;
}
