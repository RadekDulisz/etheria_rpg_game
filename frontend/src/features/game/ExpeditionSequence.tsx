import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { formatInteger } from '../../lib/formatters';
import type { MissionResult } from '../../types/game';

const DURATION_BY_TIER: Record<number, number> = {
  1: 8_000,
  2: 10_000,
  3: 12_000,
  4: 16_000,
  5: 20_000,
};

const STORY_BEATS: Record<number, string[]> = {
  1: ['Bohater opuszcza bramy Etherii…', 'Ślady prowadzą wzdłuż starego traktu…', 'Wśród zarośli rozlega się szelest…', 'Nad szlakiem zapada niespokojna cisza…'],
  2: ['Bohater znika w popielnej mgle…', 'Zwiadowcze znaki urywają się przy ruinach…', 'W ciemności rozlega się szczęk stali…', 'Światło w starej wieży zaczyna gasnąć…'],
  3: ['Kamienne wrota zamykają się za bohaterem…', 'Z głębi katakumb dobiega szept umarłych…', 'Stal spotyka się z pradawną klątwą…', 'Korytarze milkną. Los wciąż pozostaje nieznany…'],
  4: ['Krwawe niebo płonie nad czarnym bastionem…', 'Przeklęci rycerze zwierają szeregi…', 'Brama drży pod ciężarem starcia…', 'Pośród dymu pozostaje tylko jedna sylwetka…'],
  5: ['Bohater przekracza próg Czarnej Cytadeli…', 'Głosy poległych królów budzą się w pustce…', 'Serce twierdzy rozdziera bezgwiezdną noc…', 'Czas zamiera przed ostatecznym rozstrzygnięciem…'],
};

interface ExpeditionSequenceProps {
  result: MissionResult | null;
  onComplete: () => void;
}

export function ExpeditionSequence({ result, onComplete }: ExpeditionSequenceProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<'journey' | 'result'>('journey');
  const [displayedBeatIndex, setDisplayedBeatIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const completedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!result) return;
    completedRef.current = false;
    setPhase('journey');
    setDisplayedBeatIndex(0);
    setTextVisible(true);
    setElapsed(0);
    const startedAt = Date.now();
    const duration = DURATION_BY_TIER[result.tier] ?? 8_000;
    const timer = window.setInterval(() => {
      const nextElapsed = Date.now() - startedAt;
      setElapsed(Math.min(nextElapsed, duration));
      if (nextElapsed >= duration && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(timer);
        timerRef.current = null;
        setPhase('result');
      }
    }, 80);
    timerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      timerRef.current = null;
    };
  }, [result]);

  const duration = result ? DURATION_BY_TIER[result.tier] ?? 8_000 : 1;
  const progress = result ? Math.min(1, elapsed / duration) : 0;
  const beats = result ? STORY_BEATS[result.tier] ?? STORY_BEATS[1] : STORY_BEATS[1];
  const beatIndex = Math.min(beats.length - 1, Math.floor(progress * beats.length));
  const canSkip = Boolean(result && elapsed >= 2_000 && phase === 'journey');

  useEffect(() => {
    if (!result || phase !== 'journey' || beatIndex === displayedBeatIndex) return;
    setTextVisible(false);
    const swapTimer = window.setTimeout(() => {
      setDisplayedBeatIndex(beatIndex);
      window.requestAnimationFrame(() => setTextVisible(true));
    }, 360);
    return () => window.clearTimeout(swapTimer);
  }, [beatIndex, displayedBeatIndex, phase, result]);

  function skip() {
    if (!result || !canSkip || completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase('result');
  }

  const won = result?.result === 'SUCCESS';

  return createPortal(
    <div className={`expedition-sequence expedition-sequence-tier-${result?.tier ?? 1} ${phase === 'result' ? `expedition-sequence-resolved expedition-sequence-resolved-${won ? 'success' : 'failure'}` : ''}`} role="dialog" aria-modal="true" aria-label="Wyprawa w toku">
      <img className="expedition-sequence-art" src={`/assets/missions/mission-tier-${result?.tier ?? 1}.jpg`} alt="" />
      <div className="expedition-sequence-shade" />
      <div className="expedition-sequence-atmosphere" aria-hidden="true"><i /><i /><i /></div>

      <header className="expedition-sequence-header">
        <BrandLogo />
        <span>{phase === 'result' ? 'Rozstrzygnięcie wyprawy' : result ? `Wyprawa typu ${result.tier}` : 'Wyznaczanie szlaku'}</span>
      </header>

      {phase === 'journey' ? <main className="expedition-sequence-content">
        <p className="expedition-sequence-kicker">{result ? `${result.title} · ${result.choiceTitle ?? 'Wybrana droga'}` : 'Los prowadzi bohatera w nieznane'}</p>
        <h1 className={`expedition-story-beat ${textVisible ? 'expedition-story-beat-visible' : 'expedition-story-beat-hidden'}`}>{result ? beats[displayedBeatIndex] : 'Bramy Etherii otwierają się…'}</h1>
        <p className="expedition-sequence-description">
          {result ? result.choiceDescription ?? result.description : 'Zwiadowcy wybierają drogę, z której nie każdy powraca.'}
        </p>

        <div className={`expedition-progress ${result ? '' : 'expedition-progress-pending'}`}>
          <div className="expedition-progress-track"><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="expedition-progress-meta">
            <span>{result ? `Etap ${beatIndex + 1} z ${beats.length}` : 'Przygotowanie'}</span>
            <strong className="game-number">{result ? `${Math.round(progress * 100)}%` : '…'}</strong>
          </div>
        </div>

        <p className="expedition-sequence-warning">Nie opuszczaj szlaku. Wynik zostanie odsłonięty po zakończeniu wyprawy.</p>
      </main> : result ? <main className={`expedition-result-screen expedition-result-${won ? 'success' : 'failure'}`}>
        <div className="expedition-result-verdict" role="status"><span>{won ? 'SUKCES' : 'PORAŻKA'}</span></div>
        <p className="expedition-result-kicker">{won ? 'Wieść o czynie dotrze do Etherii' : 'Szlak zachował swoją tajemnicę'}</p>
        <h1>{result.title}</h1>
        <p className="expedition-result-outcome">{result.outcomeText}</p>
        <div className="expedition-result-rewards">
          <article><strong>{won ? <CurrencyAmount value={result.goldReward} compact /> : '0'}</strong><span>Złoto</span></article>
          <article><strong>{formatInteger(result.experienceReward)} XP</strong><span>Doświadczenie</span></article>
          <article className="expedition-result-damage"><strong>−{result.hpLost} HP</strong><span>Odniesione rany</span></article>
          <article className={result.reputationChange > 0 ? 'expedition-result-reputation-good' : 'expedition-result-reputation-evil'}><strong>{result.reputationChange > 0 ? '+' : ''}{result.reputationChange} REP</strong><span style={{ color: result.reputationRank.color }}>{result.reputationRank.name}</span></article>
          {result.rewardItem ? <article className="expedition-result-item"><i><ItemIcon item={result.rewardItem} /></i><div><strong>Zdobyto przedmiot</strong><span>{result.rewardItem.name}</span></div></article> : null}
        </div>
        <button className="expedition-result-return" type="button" onClick={() => onCompleteRef.current()}>Wróć do kroniki</button>
      </main> : null}

      {phase === 'journey' ? <footer className="expedition-sequence-footer">
        <span>Rozstrzygnięcie zostało zapisane w Kronikach Etherii</span>
        {canSkip ? <button type="button" onClick={skip}>Pomiń oczekiwanie</button> : <span className="expedition-skip-placeholder">Pominięcie dostępne po chwili…</span>}
      </footer> : null}
    </div>,
    document.body,
  );
}
