import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ActionToastProps {
  children: ReactNode;
  onDismiss: () => void;
  duration?: number;
  tone?: 'success' | 'error';
  placement?: 'top' | 'bottom';
}

export function ActionToast({ children, onDismiss, duration = 4_200, tone = 'success', placement = 'bottom' }: ActionToastProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDismissRef.current(), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return createPortal(
    <aside className={`action-event-toast action-event-toast-${tone} action-event-toast-${placement}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span className="action-event-toast-seal" aria-hidden="true"><i>{tone === 'error' ? '!' : '✓'}</i></span>
      <div><small>{tone === 'error' ? 'Nie wykonano działania' : 'Zapisano w kronice'}</small><p>{children}</p></div>
      <button type="button" aria-label="Zamknij komunikat" onClick={onDismiss}>×</button>
    </aside>,
    document.body,
  );
}
