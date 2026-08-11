import type { GameView } from '../../types/game';

interface NavigationItem {
  id: GameView;
  rune: string;
  label: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'overview', rune: 'I', label: 'Twierdza', description: 'Główny widok' },
  { id: 'character', rune: 'II', label: 'Bohater', description: 'Postać i statystyki' },
  { id: 'inventory', rune: 'III', label: 'Zbrojownia', description: 'Plecak i wyposażenie' },
  { id: 'shop', rune: 'IV', label: 'Targowisko', description: 'Oferta dnia' },
  { id: 'merchant', rune: 'V', label: 'Kupiec', description: 'Stały katalog' },
  { id: 'blacksmith', rune: 'VI', label: 'Kowal', description: 'Ulepszenia i gniazda' },
  { id: 'jeweler', rune: 'VII', label: 'Jubiler', description: 'Szlifowanie i odzysk' },
  { id: 'tavern', rune: 'VIII', label: 'Karczma', description: 'Fabularne zlecenia' },
  { id: 'pve', rune: 'IX', label: 'Wyprawy', description: 'Starcia PvE' },
  { id: 'pvp', rune: 'X', label: 'Arena', description: 'Pojedynki graczy' },
  { id: 'guild', rune: 'XI', label: 'Bractwo', description: 'Gildia i wojny' },
  { id: 'property', rune: 'XII', label: 'Posiadłość', description: 'Rozbudowa i dochód' },
];

interface GameNavigationProps {
  activeView: GameView;
  onNavigate: (view: GameView) => void;
}

export function GameNavigation({ activeView, onNavigate }: GameNavigationProps) {
  return (
    <nav className="game-navigation" aria-label="Nawigacja gry">
      {navigationItems.map((item) => {
        const active = item.id === activeView;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            className={`game-navigation-item ${active ? 'game-navigation-item-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="game-navigation-rune" aria-hidden="true"><span>{item.rune}</span></span>
            <span className="min-w-0 text-left">
              <span className="block text-xs uppercase tracking-[0.15em] text-stone-200">{item.label}</span>
              <span className="mt-0.5 hidden text-[0.65rem] text-stone-500 lg:block">{item.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
