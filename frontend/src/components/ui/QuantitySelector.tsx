interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuantitySelector({ value, min = 1, max = 99, disabled = false, onChange }: QuantitySelectorProps) {
  return (
    <div className="inline-grid grid-cols-[2rem_2.5rem_2rem] border border-amber-800/30" aria-label="Wybór liczby sztuk">
      <button type="button" className="bg-black/20 text-amber-200 hover:bg-amber-800/15 disabled:opacity-30" onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min} aria-label="Zmniejsz liczbę">−</button>
      <span className="grid place-items-center border-x border-amber-800/25 bg-slate-950/45 text-xs text-stone-200">{value}</span>
      <button type="button" className="bg-black/20 text-amber-200 hover:bg-amber-800/15 disabled:opacity-30" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label="Zwiększ liczbę">+</button>
    </div>
  );
}
