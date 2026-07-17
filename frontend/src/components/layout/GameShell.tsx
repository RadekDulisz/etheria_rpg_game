import type { ReactNode } from 'react';
import type { Character, EquippedEntry, GameView } from '../../types/game';
import { Button } from '../ui/Button';
import { GameNavigation } from './GameNavigation';
import { GameTopbar } from './GameTopbar';
import { HeroRail } from './HeroRail';

interface GameShellProps {
  character: Character;
  equipment: EquippedEntry[];
  activeView: GameView;
  refreshing: boolean;
  loggingOut: boolean;
  onNavigate: (view: GameView) => void;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function GameShell({
  character,
  equipment,
  activeView,
  refreshing,
  loggingOut,
  onNavigate,
  onRefresh,
  onLogout,
  children,
}: GameShellProps) {
  return (
    <div className="game-shell">
      <GameTopbar />
      <div className="game-shell-grid">
        <aside className="game-sidebar">
          <GameNavigation activeView={activeView} onNavigate={onNavigate} />
          <div className="mt-auto grid gap-2 border-t border-amber-700/20 p-3">
            <Button variant="secondary" fullWidth onClick={onRefresh} disabled={refreshing}>
              {refreshing ? 'Odświeżanie…' : 'Odśwież sesję'}
            </Button>
            <Button variant="danger" fullWidth onClick={onLogout} disabled={loggingOut}>
              {loggingOut ? 'Wylogowywanie…' : 'Wyloguj'}
            </Button>
          </div>
        </aside>

        <main className="game-content">{children}</main>
        <HeroRail character={character} equipment={equipment} />
      </div>
    </div>
  );
}
