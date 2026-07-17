interface ActionNoticeProps {
  tone: 'success' | 'error';
  children: string;
  onDismiss?: () => void;
}

export function ActionNotice({ tone, children, onDismiss }: ActionNoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 flex items-center justify-between gap-4 border px-3 py-2 text-sm ${
        tone === 'success'
          ? 'border-emerald-800/45 bg-emerald-950/20 text-emerald-200'
          : 'border-red-900/50 bg-red-950/20 text-red-200'
      }`}
    >
      <span>{children}</span>
      {onDismiss ? <button type="button" className="text-xs uppercase tracking-[0.14em] opacity-60 hover:opacity-100" onClick={onDismiss}>Zamknij</button> : null}
    </div>
  );
}

