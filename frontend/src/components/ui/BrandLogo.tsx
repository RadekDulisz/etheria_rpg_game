export function BrandLogo() {
  return (
    <div className="brand-logo" role="img" aria-label="Kroniki Etherii">
      <svg className="brand-crest" viewBox="0 0 92 92" aria-hidden="true">
        <defs>
          <linearGradient id="brand-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7f5421" />
            <stop offset="0.42" stopColor="#f0ca78" />
            <stop offset="0.7" stopColor="#b57a2d" />
            <stop offset="1" stopColor="#654018" />
          </linearGradient>
          <radialGradient id="brand-core" cx="50%" cy="38%" r="65%">
            <stop offset="0" stopColor="#182a35" />
            <stop offset="0.55" stopColor="#0a131a" />
            <stop offset="1" stopColor="#03070a" />
          </radialGradient>
          <filter id="brand-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path className="brand-crest-wing" d="M20 30C12 30 8 25 4 18c7 4 13 3 18-1M72 30c8 0 12-5 16-12-7 4-13 3-18-1M20 62C12 62 8 67 4 74c7-4 13-3 18 1M72 62c8 0 12 5 16 12-7-4-13-3-18 1" />
        <path className="brand-crest-frame" d="M46 3c7 8 13 12 23 14 0 10 5 18 17 29-12 11-17 19-17 29-10 2-16 6-23 14-7-8-13-12-23-14 0-10-5-18-17-29 12-11 17-19 17-29 10-2 16-6 23-14Z" />
        <path className="brand-crest-inner" d="M46 10c6 6 11 9 18 11 1 9 5 16 14 25-9 9-13 16-14 25-7 2-12 5-18 11-6-6-11-9-18-11-1-9-5-16-14-25 9-9 13-16 14-25 7-2 12-5 18-11Z" />
        <path className="brand-crest-rune" d="M29 25c5-1 8-4 10-9 1 5 3 7 7 8 4-1 6-3 7-8 2 5 5 8 10 9M29 67c5 1 8 4 10 9 1-5 3-7 7-8 4 1 6 3 7 8 2-5 5-8 10-9" />
        <circle cx="46" cy="13" r="1.4" className="brand-crest-gem" />
        <circle cx="46" cy="79" r="1.4" className="brand-crest-gem" />

        <g className="brand-monogram" filter="url(#brand-glow)">
          <path d="M35 29v34M30 29h11M30 63h11M36 47l16-18M43 39l14 24M51 29h7M52 63h8" />
          <path className="brand-monogram-flourish" d="M35 30c-4-4-3-8 1-10 0 4 3 6 6 5M35 62c-4 4-3 8 1 10 0-4 3-6 6-5M53 30c4-4 8-4 10-1-4 0-6 2-6 5M57 58c0 4 2 6 6 5-2 3-6 3-10-1" />
        </g>
      </svg>

      <span className="brand-wordmark">
        <span className="brand-kicker"><i /><span>Kroniki</span><i /></span>
        <span className="brand-name">Etherii</span>
      </span>
    </div>
  );
}
