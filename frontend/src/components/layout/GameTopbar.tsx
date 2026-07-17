import { BrandLogo } from '../ui/BrandLogo';

function TopbarOrnament({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg className={`topbar-ornament ${mirrored ? 'topbar-ornament-mirrored' : ''}`} viewBox="0 0 440 72" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={mirrored ? 'topbar-metal-r' : 'topbar-metal-l'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f2a14" stopOpacity="0" />
          <stop offset="0.38" stopColor="#7d5426" stopOpacity="0.42" />
          <stop offset="0.82" stopColor="#d5a650" stopOpacity="0.78" />
          <stop offset="1" stopColor="#8a5925" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id={mirrored ? 'topbar-gem-r' : 'topbar-gem-l'}>
          <stop offset="0" stopColor="#a8e0e5" />
          <stop offset="0.42" stopColor="#397e94" />
          <stop offset="1" stopColor="#0b2633" />
        </radialGradient>
      </defs>
      <path className="topbar-ornament-line" stroke={`url(#${mirrored ? 'topbar-metal-r' : 'topbar-metal-l'})`} d="M0 36h276c31 0 43-18 72-18 25 0 39 12 58 18" />
      <path className="topbar-ornament-line topbar-ornament-line-fine" stroke={`url(#${mirrored ? 'topbar-metal-r' : 'topbar-metal-l'})`} d="M42 43h242c29 0 42 15 66 15 21 0 35-10 54-20" />
      <path className="topbar-ornament-filigree" d="M302 36c12-14 24-20 39-20-6 7-4 14 4 20-8 6-10 13-4 20-15 0-27-6-39-20Zm68 0c7-9 14-13 24-13-4 5-3 9 3 13-6 4-7 8-3 13-10 0-17-4-24-13Z" />
      <path className="topbar-ornament-spine" d="m351 36 9-9 9 9-9 9-9-9Zm54 0 8-8 17 8-17 8-8-8Z" />
      <circle cx="360" cy="36" r="3.2" fill={`url(#${mirrored ? 'topbar-gem-r' : 'topbar-gem-l'})`} className="topbar-ornament-gem" />
    </svg>
  );
}

export function GameTopbar() {
  return (
    <header className="game-topbar game-topbar-brand-only">
      <TopbarOrnament />
      <BrandLogo />
      <TopbarOrnament mirrored />
    </header>
  );
}
