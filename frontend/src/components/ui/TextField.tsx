import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export function TextField({ label, error, id, className = '', ...props }: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.16em] text-stone-400">{label}</span>
      <input
        id={inputId}
        className={`w-full border border-slate-500/35 bg-slate-950/65 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 ${className}`.trim()}
        {...props}
      />
      {error ? <span className="mt-1.5 block text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

