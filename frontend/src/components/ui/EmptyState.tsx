import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  children: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-amber-700/30 bg-black/15 px-5 py-12 text-center">
      <span className="mx-auto block h-8 w-8 rotate-45 border border-amber-600/35" aria-hidden="true" />
      <h3 className="mt-5 text-base text-amber-100 fantasy-title">{title}</h3>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">{children}</div>
    </div>
  );
}

