import type { SessionUser } from '../../types/game';
import { Button } from '../../components/ui/Button';
import { GamePanel } from '../../components/ui/GamePanel';
import { StatusDot } from '../../components/ui/StatusDot';

interface AdminWorkspaceProps {
  session: SessionUser;
  worldOnline: boolean;
  onLogout: () => void;
  loggingOut: boolean;
}

export function AdminWorkspace({ session, worldOnline, onLogout, loggingOut }: AdminWorkspaceProps) {
  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-center justify-between border border-amber-700/30 bg-slate-950/85 px-4 py-3">
          <div><p className="text-[0.6rem] uppercase tracking-[0.25em] text-amber-500/60">Kroniki Etherii</p><h1 className="text-xl text-amber-100 fantasy-title">Panel zarządcy świata</h1></div>
          <div className="flex items-center gap-4"><StatusDot label={worldOnline ? 'Serwer działa' : 'Serwer nie odpowiada'} online={worldOnline} /><Button variant="danger" onClick={onLogout} disabled={loggingOut}>Wyloguj</Button></div>
        </header>
        <GamePanel title="Centrum administracyjne" eyebrow={session.email}>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Przedmioty', 'Katalog, ceny i parametry wyposażenia'],
              ['Przeciwnicy', 'Boty PvE, nagrody i aktywność'],
              ['Balans', 'Korekty ekonomii i postaci graczy'],
            ].map(([title, description]) => (
              <article key={title} className="border border-amber-800/25 bg-black/15 p-4"><p className="text-amber-100 fantasy-title">{title}</p><p className="mt-2 text-sm leading-6 text-stone-500">{description}</p><p className="mt-5 text-[0.6rem] uppercase tracking-[0.18em] text-amber-500/50">Interfejs w przygotowaniu</p></article>
            ))}
          </div>
        </GamePanel>
      </div>
    </main>
  );
}
