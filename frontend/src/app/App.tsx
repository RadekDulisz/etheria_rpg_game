import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { getSession, logout, refreshSession } from '../api/auth.api';
import { getMyCharacter } from '../api/character.api';
import { getHealth } from '../api/health.api';
import { AdminWorkspace } from '../features/admin/AdminWorkspace';
import { AuthGateway } from '../features/auth/AuthGateway';
import { CreateCharacterView } from '../features/character/CreateCharacterView';
import { PlayerWorkspace } from '../features/game/PlayerWorkspace';
import { ExpeditionSequence } from '../features/game/ExpeditionSequence';
import { ArenaSequence } from '../features/game/ArenaSequence';
import { BlacksmithForgePreview } from '../features/game/BlacksmithView';
import { BrandLogo } from '../components/ui/BrandLogo';
import { LevelUpCelebration } from '../components/ui/LevelUpCelebration';
import type { ArenaBattleResult, ArenaOpponent, MissionResult } from '../types/game';

const EXPEDITION_PREVIEW_RESULT: MissionResult = {
  id: 'expedition-preview',
  tier: 3,
  title: 'Szept Popielnych Katakumb',
  description: 'Pod ruinami starego sanktuarium obudziła się moc, której imienia nie zapisano w żadnej kronice.',
  outcomeText: 'Bohater przełamał pieczę katakumb i powrócił ze szlaku, zanim pradawna klątwa pochłonęła ostatnie światło.',
  result: 'SUCCESS',
  morality: 'GOOD',
  choiceTitle: 'Ocalić uwięzionych pielgrzymów',
  choiceDescription: 'Bohater zbacza z bezpiecznego szlaku, aby wyprowadzić zagubionych z podziemi.',
  reputationChange: 2,
  goldReward: '84',
  experienceReward: '22',
  hpLost: 31,
  rewardItem: null,
  rewardGemDefinition: null,
  createdAt: new Date(0).toISOString(),
  health: { current: 69, max: 100 },
  level: 6,
  balanceAfter: '584',
  reputationAfter: 126,
  reputationRank: { name: 'Włóczęga', color: '#79aee3', threshold: 100, alignment: 'GOOD' },
};

const ARENA_FINISHER_PREVIEW_OPPONENT: ArenaOpponent = {
  id: 'arena-finisher-preview-opponent',
  combatantId: 'preview-defender',
  name: 'Garrik — Kruk Etherii',
  level: 7,
  maxHp: 128,
  expReward: 44,
  goldReward: 36,
  challenge: 'KORZYSTNY',
  powerRatio: 0.94,
  arenaRating: 1260,
  arenaRank: { title: 'Żelazny Wojownik', color: '#aeb8bd', frame: 'iron', threshold: 1250 },
  reputation: -184,
  reputationRank: { name: 'Rozbójnik', color: '#e15c58', threshold: 150, alignment: 'EVIL' },
  entryHpCost: 13,
  currentHp: 154,
  canFight: true,
  stats: {
    strength: 10,
    agility: 9,
    endurance: 11,
    intelligence: 6,
    attack: 24,
    attackMin: 20,
    attackMax: 29,
    defense: 17,
  },
};

const ARENA_FINISHER_PREVIEW_RESULT: ArenaBattleResult = {
  id: 'arena-finisher-preview',
  result: 'ATTACKER_WIN',
  expReward: 44,
  goldReward: 36,
  attacker: { combatantId: 'preview-attacker', name: 'Egi', level: 7, maxHp: 154 },
  defender: {
    combatantId: ARENA_FINISHER_PREVIEW_OPPONENT.combatantId,
    name: ARENA_FINISHER_PREVIEW_OPPONENT.name,
    level: ARENA_FINISHER_PREVIEW_OPPONENT.level,
    maxHp: ARENA_FINISHER_PREVIEW_OPPONENT.maxHp,
  },
  rounds: [{
    id: 'arena-finisher-preview-round',
    roundNumber: 8,
    actorId: 'preview-attacker',
    actionType: 'CRITICAL_HIT',
    damageDealt: 128,
    actorHpAfter: 47,
    targetHpAfter: 0,
  }],
  expertiseReward: {
    weaponType: 'SWORD',
    experienceGained: 42,
    experienceAfter: 318,
    levelBefore: 4,
    levelAfter: 4,
    leveledUp: false,
  },
  arenaProfile: {
    ratingBefore: 1450,
    ratingChange: 18,
    ratingAfter: 1468,
    rank: { title: 'Gladiator', color: '#c9d8df', frame: 'silver', threshold: 1450 },
    nextRank: { title: 'Mistrz Areny', color: '#e0b95f', frame: 'gold', threshold: 1700 },
    wins: 24,
    losses: 9,
    draws: 2,
    hpCost: 13,
    hpAfter: 141,
    maxHp: 154,
    reputationChange: 1,
    reputationAfter: 127,
    reputationRank: { name: 'Dziedzic', color: '#65b9f1', threshold: 75, alignment: 'GOOD' },
  },
};

function LoadingScreen() {
  return (
    <main className="chronicle-loading-screen" aria-live="polite" aria-label="Otwieranie kronik">
      <div className="chronicle-loading-backdrop" aria-hidden="true" />
      <div className="chronicle-loading-shade" aria-hidden="true" />
      <section className="chronicle-loading-content">
        <BrandLogo />
        <p>Otwieranie kronik</p>
        <small>Odczytywanie losów bohatera…</small>
        <div className="chronicle-loading-progress" aria-hidden="true"><span /></div>
      </section>
    </main>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 10_000 });
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: getSession });
  const characterQuery = useQuery({
    queryKey: ['character', 'me'],
    queryFn: getMyCharacter,
    enabled: Boolean(sessionQuery.data && sessionQuery.data.role === 'PLAYER'),
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: refreshSession,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['session'] }),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['character'] });
      queryClient.removeQueries({ queryKey: ['inventory'] });
      queryClient.removeQueries({ queryKey: ['equipment'] });
      queryClient.removeQueries({ queryKey: ['shop'] });
      queryClient.removeQueries({ queryKey: ['missions'] });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const previewLoading = new URLSearchParams(window.location.search).has('preview-loading');
  const previewLevelUp = new URLSearchParams(window.location.search).has('preview-level-up');
  const previewExpedition = new URLSearchParams(window.location.search).has('preview-expedition');
  const previewArenaFinisher = new URLSearchParams(window.location.search).has('preview-arena-finisher');
  const previewBlacksmith = new URLSearchParams(window.location.search).get('preview-blacksmith');
  const worldOnline = healthQuery.data?.status === 'ok';

  if (previewArenaFinisher) {
    return (
      <ArenaSequence
        opponent={ARENA_FINISHER_PREVIEW_OPPONENT}
        result={ARENA_FINISHER_PREVIEW_RESULT}
        challenge={ARENA_FINISHER_PREVIEW_OPPONENT.challenge}
        previewFinisher
        onComplete={() => window.location.reload()}
      />
    );
  }
  if (previewBlacksmith === 'success' || previewBlacksmith === 'failure') {
    return <BlacksmithForgePreview outcome={previewBlacksmith} />;
  }
  if (previewExpedition) {
    return <ExpeditionSequence result={EXPEDITION_PREVIEW_RESULT} onComplete={() => undefined} />;
  }
  if (previewLevelUp) {
    return (
      <>
        <div className="level-up-preview-backdrop" aria-hidden="true" />
        <LevelUpCelebration
          event={{
            previousLevel: 5,
            level: 6,
            maxHpGained: 12,
            learningPointsGained: 4,
            experienceToNextLevel: '720',
          }}
          onClose={() => undefined}
        />
      </>
    );
  }
  if (previewLoading) return <LoadingScreen />;
  if (sessionQuery.isLoading) return <LoadingScreen />;

  if (!sessionQuery.data) {
    return <AuthGateway worldOnline={worldOnline} onAuthenticated={() => queryClient.invalidateQueries({ queryKey: ['session'] })} />;
  }

  if (sessionQuery.data.role === 'ADMIN') {
    return <AdminWorkspace session={sessionQuery.data} worldOnline={worldOnline} onLogout={() => logoutMutation.mutate()} loggingOut={logoutMutation.isPending} />;
  }

  const characterStatus = (characterQuery.error as AxiosError | null)?.response?.status;
  if (characterStatus === 404) {
    return <CreateCharacterView onCreated={() => queryClient.invalidateQueries({ queryKey: ['character', 'me'] })} />;
  }

  if (!characterQuery.data) return <LoadingScreen />;

  return (
    <PlayerWorkspace
      character={characterQuery.data}
      refreshing={refreshMutation.isPending}
      loggingOut={logoutMutation.isPending}
      testToolsEnabled={sessionQuery.data.testToolsEnabled}
      onRefresh={() => refreshMutation.mutate()}
      onLogout={() => logoutMutation.mutate()}
    />
  );
}
