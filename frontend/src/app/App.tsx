import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { getSession, logout, refreshSession } from '../api/auth.api';
import { getMyCharacter } from '../api/character.api';
import { getHealth } from '../api/health.api';
import { AdminWorkspace } from '../features/admin/AdminWorkspace';
import { AuthGateway } from '../features/auth/AuthGateway';
import { CreateCharacterView } from '../features/character/CreateCharacterView';
import { PlayerWorkspace } from '../features/game/PlayerWorkspace';

function LoadingScreen() {
  return (
    <main className="gateway-screen">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin border border-amber-600/50 border-t-amber-200" />
        <p className="mt-5 text-xs uppercase tracking-[0.24em] text-stone-500">Otwieranie kronik…</p>
      </div>
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

  const worldOnline = healthQuery.data?.status === 'ok';

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
      onRefresh={() => refreshMutation.mutate()}
      onLogout={() => logoutMutation.mutate()}
    />
  );
}
