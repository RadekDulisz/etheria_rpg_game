interface SectionTitleProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <header className="mb-4 border-b border-amber-700/25 pb-4">
      <p className="text-[0.62rem] uppercase tracking-[0.26em] text-amber-500/65">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl text-amber-100 fantasy-title sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">{description}</p>
    </header>
  );
}

