import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatInteger } from '../../lib/formatters';

export interface LevelUpEvent {
  previousLevel: number;
  level: number;
  maxHpGained: number;
  learningPointsGained: number;
  experienceToNextLevel: string;
}

interface LevelUpCelebrationProps {
  event: LevelUpEvent;
  onClose: () => void;
}

const FULLSCREEN_SEQUENCE_SELECTOR = '.expedition-sequence, .arena-sequence';

export function LevelUpCelebration({ event, onClose }: LevelUpCelebrationProps) {
  const [revealed, setRevealed] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let revealTimer: number | null = null;
    const observer = new MutationObserver(() => revealWhenReady());

    function revealWhenReady() {
      if (document.querySelector(FULLSCREEN_SEQUENCE_SELECTOR)) return;
      observer.disconnect();
      revealTimer = window.setTimeout(() => setRevealed(true), 450);
    }

    observer.observe(document.body, { childList: true, subtree: true });
    revealWhenReady();
    return () => {
      observer.disconnect();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeTimer = window.setTimeout(() => onCloseRef.current(), 9_000);
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(closeTimer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [revealed]);

  if (!revealed) return null;

  const gainedLevels = event.level - event.previousLevel;
  return createPortal(
    <div className="level-up-celebration" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <div className="level-up-veil" />
      <div className="level-up-radiance" aria-hidden="true"><i /><i /><i /></div>
      <div className="level-up-wings" aria-hidden="true">
        <span className="level-up-wing level-up-wing-left">
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
        </span>
        <span className="level-up-wing level-up-wing-right">
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
        </span>
      </div>
      <div className="level-up-feathers" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
      <div className="level-up-particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
      <main className="level-up-content">
        <p>Światło Etherii odpowiada na Twój czyn</p>
        <h1 id="level-up-title">AWANS</h1>
        <div className="level-up-number" aria-label={`Osiągnięto poziom ${event.level}`}>
          <small>POZIOM</small><strong>{event.level}</strong>
        </div>
        <section className="level-up-gains" aria-label="Korzyści z awansu">
          <article><em>♥</em><span>Maksymalne zdrowie</span><strong>+{event.maxHpGained} HP</strong></article>
          <article><em>✦</em><span>Punkty nauki</span><strong>+{event.learningPointsGained} PTS</strong></article>
          <article><em>▲</em><span>Zdobyte poziomy</span><strong>+{gainedLevels} LVL</strong></article>
          <article><em>◆</em><span>Następny próg</span><strong>{formatInteger(event.experienceToNextLevel)} XP</strong></article>
        </section>
        <p className="level-up-guidance">Rozdziel nowe punkty pomiędzy STR, DEX, CON oraz INT.</p>
        <button type="button" onClick={() => onCloseRef.current()}>Przyjmij błogosławieństwo</button>
      </main>
    </div>,
    document.body,
  );
}
