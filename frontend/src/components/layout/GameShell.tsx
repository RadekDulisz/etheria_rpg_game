import type { ReactNode } from 'react';
import type { Character, EquippedEntry, GameView } from '../../types/game';
import { Button } from '../ui/Button';
import { GameNavigation } from './GameNavigation';
import { GameTopbar } from './GameTopbar';
import { HeroRail } from './HeroRail';
import { TestToolsPanel } from './TestToolsPanel';

interface GameShellProps {
  character: Character;
  equipment: EquippedEntry[];
  activeView: GameView;
  refreshing: boolean;
  loggingOut: boolean;
  testToolsEnabled?: boolean;
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
  testToolsEnabled = false,
  onNavigate,
  onRefresh,
  onLogout,
  children,
}: GameShellProps) {
  return (
    <div className={`game-shell ${testToolsEnabled ? 'game-shell-testing' : ''}`}>
      <GameTopbar />
      <div className="game-shell-grid">
        <aside className="game-sidebar">
          <GameNavigation activeView={activeView} onNavigate={onNavigate} />
          <div className="game-sidebar-session-actions">
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
      {testToolsEnabled ? <TestToolsPanel character={character} /> : null}
    </div>
  );
}
