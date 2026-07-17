import type { ReactNode } from 'react';
import type { GameIconName } from '../../lib/game-icons';

export function GameIcon({ name, className = '' }: { name: GameIconName; className?: string }) {
  return (
    <svg className={`game-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

const iconPaths: Record<GameIconName, ReactNode> = {
  strength: <><path d="M4 18.5c1.8-1.5 2.8-4 3.5-7.1l3.3.8-.7 3.1c1.4-1.8 2.5-3.8 4.5-4.9 1.8-1 3.8.3 3.4 2.2l-.5 2.1H19c1.5 0 2.5 1.1 2.2 2.6-.5 2.7-3.2 4.2-7 4.2H8.5c-2 0-3.7-.9-4.5-3Z"/><path d="M7.5 11.4 8.3 8l3.3.8-.8 3.4"/></>,
  agility: <><path d="M5 15.5h6l2-7.5 2.5 5 3 .8c1 .3 1.5 1 1.5 2.2v1H8.5c-2.2 0-3.5-.5-3.5-1.5Z"/><path d="M8 13 5.5 9.5M9.5 11 7.8 7.5M11 9 10 5.5"/><path d="M6.5 19h12"/></>,
  endurance: <path d="m13.6 2.5-7 11H12l-1.5 8 7-11H12l1.6-8Z"/>,
  intelligence: <><path d="M17.5 17.5v2.8H9.8v-2.1c-2.3-1-3.8-3.2-3.8-6A7.3 7.3 0 0 1 13.5 5c3.8 0 6.5 2.5 6.5 6l-2 1.8.5 2.2-2 .8v1.7Z"/><path d="M9 10c0-1.2 1-2 2-1.5.4-1.8 2.8-1.8 3.2-.2 1.8-.3 2.5 1.9 1.2 2.8 1 1.3-.3 3.1-1.8 2.5-.8 1.3-2.9.8-2.8-.8-1.8.2-2.7-1.8-1.4-2.8"/></>,
  attack: <><path d="m5 19 3.4-.9L19 7.5 16.5 5 5.9 15.6 5 19Z"/><path d="m13.8 7.7 2.5 2.5M4 20l3-3"/><path d="m17.5 4 2.5-.5-.5 2.5"/></>,
  defense: <><path d="M12 3 5 6v5c0 4.7 2.8 7.8 7 10 4.2-2.2 7-5.3 7-10V6l-7-3Z"/><path d="M8.5 12 11 14.5l4.8-5"/></>,
  critical: <><circle cx="10" cy="14" r="6"/><circle cx="10" cy="14" r="2.3"/><path d="m11.7 12.3 8-8M17 4l2.7.3.3 2.7M16.2 5.5l-2.7-.4M18.5 7.8l.4 2.7"/></>,
  parry: <><path d="m5 20 2.8-1L19 7.8 16.2 5 5 16.2 5 20Z"/><path d="m19 20-2.8-1L5 7.8 7.8 5 19 16.2v3.8Z"/><path d="m13.5 7.7 2.8 2.8M10.5 7.7l-2.8 2.8"/></>,
  points: <><path d="m12 3 2.2 5.3L20 9l-4.3 3.7L17 18l-5-2.8L7 18l1.3-5.3L4 9l5.8-.7L12 3Z"/><circle cx="12" cy="11" r="1"/></>,
  level: <><path d="M5 19h14M7 16l5-11 5 11Z"/><path d="M9.5 12h5"/></>,
  experience: <><path d="M12 3v18M5 7l7-4 7 4-7 4-7-4Z"/><path d="m7 12 5 3 5-3"/></>,
  gold: <><circle cx="12" cy="12" r="8"/><path d="M14.5 8.5c-.6-.5-1.4-.8-2.5-.8-1.5 0-2.5.7-2.5 1.8 0 2.8 5 1.2 5 4 0 1.1-1 1.9-2.6 1.9-1.1 0-2-.3-2.7-.9M12 6v12"/></>,
  reputation: <><path d="M12 3 9.5 8 4 9l4 4-1 6 5-3 5 3-1-6 4-4-5.5-1L12 3Z"/></>,
  weapons: <><path d="M6 20 9 19 19.2 8.8 15.2 4.8 5 15l1 5Z"/><path d="m12.5 7.5 4 4M4 21l3.5-3.5"/><path d="m16 4 4-1-1 4"/></>,
  armor: <><path d="m8 4-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3c-.5 1.4-1.8 2-4 2S8.5 5.4 8 4Z"/><path d="M8 10c2.7 1.4 5.3 1.4 8 0M12 11v9"/></>,
  jewelry: <><path d="M6 5.5c.8 6.2 2.8 9.4 6 11.5 3.2-2.1 5.2-5.3 6-11.5"/><path d="m9 4-1.5 1L9 6.5 10.5 5 9 4Zm6 0-1.5 1L15 6.5 16.5 5 15 4Z"/><path d="m12 14-2 2.5 2 3 2-3-2-2.5Z"/></>,
  special: <><path d="m12 3 2 5 5 2-5 2-2 6-2-6-5-2 5-2 2-5Z"/><path d="m18 15 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"/></>,
};
