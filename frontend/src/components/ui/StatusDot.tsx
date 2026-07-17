interface StatusDotProps {
  label: string;
  online: boolean;
}

export function StatusDot({ label, online }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-stone-400">
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-red-400'}`} />
      {label}
    </span>
  );
}

