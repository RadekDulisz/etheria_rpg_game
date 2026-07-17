import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'border-amber-500/60 bg-amber-600/15 text-amber-100 hover:bg-amber-500/25 hover:border-amber-400/80',
  secondary: 'border-slate-400/30 bg-slate-950/25 text-stone-300 hover:border-amber-500/45 hover:text-amber-100',
  danger: 'border-red-900/60 bg-red-950/15 text-red-200/75 hover:border-red-700 hover:text-red-100',
};

export function Button({ children, variant = 'primary', fullWidth = false, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`game-button ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

