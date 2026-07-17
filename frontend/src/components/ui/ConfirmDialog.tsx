import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: ReactNode;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({ title, children, confirmLabel, pending = false, onConfirm, onCancel, className = '' }: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, pending]);

  return (
      <section className={`confirm-dialog ${className}`.trim()} role="dialog" aria-labelledby="confirm-dialog-title">
        <span className="confirm-dialog-ornament" aria-hidden="true" />
        <p className="text-[0.58rem] uppercase tracking-[0.26em] text-amber-500/60">Potwierdzenie decyzji</p>
        <h2 id="confirm-dialog-title" className="mt-1.5 text-xl text-amber-100 fantasy-title">{title}</h2>
        <div className="mt-3 text-sm leading-6 text-stone-400">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-amber-800/25 pt-4">
          <Button variant="secondary" disabled={pending} onClick={onCancel}>Anuluj</Button>
          <Button autoFocus disabled={pending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
  );
}
