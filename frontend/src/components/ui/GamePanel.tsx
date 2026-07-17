import type { ReactNode } from 'react';

interface GamePanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function GamePanel({ children, className = '', title, eyebrow, action }: GamePanelProps) {
  return (
    <section className={`game-panel ${className}`.trim()}>
      {title ? (
        <header className="game-panel-header">
          <div>
            {eyebrow ? <p className="text-[0.6rem] uppercase tracking-[0.24em] text-amber-500/60">{eyebrow}</p> : null}
            <h2 className="mt-1 text-lg text-amber-100 fantasy-title">{title}</h2>
          </div>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

