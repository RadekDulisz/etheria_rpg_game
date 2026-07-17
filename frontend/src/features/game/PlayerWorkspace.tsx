import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEquipment, getInventory } from '../../api/inventory.api';
import { getTodayOffers } from '../../api/shop.api';
import { GameShell } from '../../components/layout/GameShell';
import type { Character, GameView } from '../../types/game';
import { CharacterView } from './CharacterView';
import { InventoryView } from './InventoryView';
import { MerchantView } from './MerchantView';
import { OverviewView } from './OverviewView';
import { ShopView } from './ShopView';
import { MissionsView } from './MissionsView';
import { ArenaView } from './ArenaView';
import { GuildView } from './GuildView';
import { PropertyView } from './PropertyView';
import { LevelUpCelebration, type LevelUpEvent } from '../../components/ui/LevelUpCelebration';

interface PlayerWorkspaceProps {
  character: Character;
  refreshing: boolean;
  loggingOut: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function PlayerWorkspace({ character, refreshing, loggingOut, onRefresh, onLogout }: PlayerWorkspaceProps) {
  const [activeView, setActiveView] = useState<GameView>('overview');
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const previousCharacterRef = useRef(character);
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory, retry: false });
  const equipmentQuery = useQuery({ queryKey: ['equipment'], queryFn: getEquipment, retry: false });
  const shopQuery = useQuery({ queryKey: ['shop', 'today'], queryFn: getTodayOffers, retry: false });
  const { refetch: refetchInventory } = inventoryQuery;
  const { refetch: refetchEquipment } = equipmentQuery;
  const { refetch: refetchShop } = shopQuery;

  useEffect(() => {
    const previous = previousCharacterRef.current;
    previousCharacterRef.current = character;
    if (previous.id !== character.id || character.level <= previous.level) return;
    const revealTimer = window.setTimeout(() => setLevelUpEvent({
      previousLevel: previous.level,
      level: character.level,
      maxHpGained: Math.max(0, character.maxHp - previous.maxHp),
      learningPointsGained: Math.max(0, (character.stats?.unspentPoints ?? 0) - (previous.stats?.unspentPoints ?? 0)),
      experienceToNextLevel: character.experienceToNextLevel,
    }), 0);
    return () => window.clearTimeout(revealTimer);
  }, [character]);

  const closeLevelUp = useCallback(() => setLevelUpEvent(null), []);

  useEffect(() => {
    if (activeView === 'shop') {
      void refetchShop();
    }
    if (activeView === 'inventory' || activeView === 'character') {
      void refetchInventory();
      void refetchEquipment();
    }
  }, [activeView, refetchEquipment, refetchInventory, refetchShop]);

  const inventory = inventoryQuery.data ?? [];
  const equipment = equipmentQuery.data ?? [];
  const offers = shopQuery.data ?? [];

  function renderView() {
    switch (activeView) {
      case 'character': return <CharacterView character={character} equipment={equipment} />;
      case 'inventory': return <InventoryView inventory={inventory} equipment={equipment} />;
      case 'shop': return <ShopView offers={offers} characterGold={character.gold} />;
      case 'merchant': return <MerchantView characterGold={character.gold} />;
      case 'pve': return <MissionsView />;
      case 'pvp': return <ArenaView character={character} />;
      case 'guild': return <GuildView character={character} />;
      case 'property': return <PropertyView character={character} />;
      default: return <OverviewView character={character} equipment={equipment} />;
    }
  }

  return (
    <GameShell character={character} equipment={equipment} activeView={activeView} refreshing={refreshing} loggingOut={loggingOut} onNavigate={setActiveView} onRefresh={onRefresh} onLogout={onLogout}>
      {renderView()}
      {levelUpEvent ? <LevelUpCelebration key={`${levelUpEvent.previousLevel}-${levelUpEvent.level}`} event={levelUpEvent} onClose={closeLevelUp} /> : null}
    </GameShell>
  );
}
