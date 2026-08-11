import type { ReactNode } from 'react';

interface ActionBubbleProps {
  children: ReactNode;
  tone?: 'error' | 'warning';
  onDismiss?: () => void;
  className?: string;
}

export function ActionBubble({
  children,
  tone = 'error',
  onDismiss,
  className = '',
}: ActionBubbleProps) {
  return (
    <div
      className={`action-feedback-bubble action-feedback-bubble-${tone} ${className}`.trim()}
      role="alert"
    >
      <span className="action-feedback-bubble-mark" aria-hidden="true"><span>!</span></span>
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" aria-label="Zamknij komunikat" onClick={onDismiss}>×</button>
      ) : null}
    </div>
  );
}
