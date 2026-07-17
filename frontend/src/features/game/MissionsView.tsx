import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { embarkOnMission, getMissionOverview } from '../../api/missions.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GamePanel } from '../../components/ui/GamePanel';
import { HealthBar } from '../../components/ui/HealthBar';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import { formatInteger } from '../../lib/formatters';
import type { MissionAttempt, MissionMorality } from '../../types/game';
import { ExpeditionSequence } from './ExpeditionSequence';

export function MissionsView() {
  const queryClient = useQueryClient();
  const [healthWarning, setHealthWarning] = useState<string | null>(null);
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const overviewQuery = useQuery({ queryKey: ['missions'], queryFn: getMissionOverview, retry: false });
  const missionMutation = useMutation({
    mutationFn: embarkOnMission,
    onSuccess: async () => {
      setHealthWarning(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['missions'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);
    },
    onError: () => setSequenceOpen(false),
  });

  const overview = overviewQuery.data;
  const canEmbark = Boolean(overview && overview.health.current > overview.health.max * 0.5);

  function beginExpedition(morality: MissionMorality) {
    if (!canEmbark) {
      setHealthWarning('Bohater ma 50% HP lub mniej i mógłby zginąć. Poczekaj, aż zdrowie odnowi się powyżej 50%.');
      return;
    }
    setHealthWarning(null);
    setSequenceOpen(true);
    missionMutation.mutate(morality);
  }

  return (
    <div className="view-enter">
      <SectionTitle
        eyebrow="Wyprawy"
        title="Kronika niebezpiecznych szlaków"
        description="Wyślij bohatera w nieznane. Rodzaj wyprawy jest losowany automatycznie, a nagrody rosną wraz z poziomem postaci i niebezpieczeństwem szlaku."
      />

      {missionMutation.isError ? (
        <ActionNotice tone="error" onDismiss={() => missionMutation.reset()}>{getApiErrorMessage(missionMutation.error)}</ActionNotice>
      ) : null}
      {healthWarning ? (
        <ActionNotice tone="error" onDismiss={() => setHealthWarning(null)}>{healthWarning}</ActionNotice>
      ) : null}

      <section className="mission-intro">
          <img src="/assets/missions/mission-tier-1.jpg" alt="Bohater wyruszający o świcie na trakt Etherii" />
          <div className="mission-intro-shade" />
          <div className="mission-intro-content">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-amber-400/70">Los zdecyduje o szlaku</p>
            <h2 className="mt-2 max-w-xl text-3xl text-amber-50 fantasy-title">Za bramą czeka sława albo blizny</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300/80">Każda wyprawa ma 70% szans powodzenia i kosztuje część zdrowia. Po dziesięciu wyprawach bez legendarnego zlecenia następne losowanie gwarantuje typ V.</p>
          </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <GamePanel title="Możliwe zlecenia" eyebrow="Pięć stopni ryzyka">
          {overviewQuery.isLoading ? <EmptyState title="Zwiadowcy badają szlaki">Trwa zbieranie wieści z Etherii.</EmptyState> : (
            <div className="mission-tier-list">
              {overview?.tiers.map((tier) => (
                <article key={tier.tier} className={`mission-tier mission-tier-${tier.tier}`}>
                  <img src={`/assets/missions/mission-tier-${tier.tier}.jpg`} alt="" />
                  <span className="mission-tier-number"><span>{tier.tier}</span></span>
                  <div className="mission-tier-copy">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3>{tier.name}</h3>
                      <span className="game-number text-xs text-stone-400">{tier.chance}% szans</span>
                    </div>
                    <div className="mission-tier-rewards">
                      <span><CurrencyAmount value={tier.goldMin} compact />–{formatInteger(tier.goldMax)}</span>
                      <span>{formatInteger(tier.experienceMin)}–{formatInteger(tier.experienceMax)} XP</span>
                      <span>−{tier.hpPercentMin}–{tier.hpPercentMax}% HP</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GamePanel>

        <div className="space-y-4">
          <GamePanel title="Przed wyruszeniem" eyebrow="Stan bohatera">
            <HealthBar value={overview?.health.current ?? 0} max={overview?.health.max ?? 0} />
            <dl className="mission-rules">
              <div><dt>Powodzenie</dt><dd>70%</dd></div>
              <div><dt>Losowy przedmiot</dt><dd>5%</dd></div>
              <div><dt>Wyprawy łącznie</dt><dd>{overview?.totalMissions ?? 0}</dd></div>
              <div><dt>Gwarancja typu V za</dt><dd>{overview?.missionsUntilGuaranteedTierFive ?? 10}</dd></div>
            </dl>
            <div className="mission-morality-choice">
              <p>Wybierz drogę bohatera</p>
              <button className="mission-morality-card mission-morality-good" disabled={missionMutation.isPending || overviewQuery.isLoading} onClick={() => beginExpedition('GOOD')}>
                <span className="mission-morality-mark"><span>✦</span></span>
                <span><strong>Szlachetna droga</strong><small>Chroń bezbronnych i odrzuć łatwy zysk.</small><em>+1 do +3 reputacji</em></span>
              </button>
              <button className="mission-morality-card mission-morality-evil" disabled={missionMutation.isPending || overviewQuery.isLoading} onClick={() => beginExpedition('EVIL')}>
                <span className="mission-morality-mark"><span>◆</span></span>
                <span><strong>Mroczna droga</strong><small>Wykorzystaj chaos, strach i cudzą słabość.</small><em>−1 do −3 reputacji</em></span>
              </button>
              {missionMutation.isPending ? <span className="mission-morality-pending">Bohater jest już na szlaku…</span> : null}
            </div>
            <p className="mt-3 text-center text-[0.65rem] leading-5 text-stone-500">Zdrowie odnawia się samo: 5% maksymalnego HP co 5 minut. Wyruszyć można wyłącznie z poziomem zdrowia powyżej 50%.</p>
          </GamePanel>
        </div>
      </div>

      <GamePanel className="mt-4" title="Ostatnie wyprawy" eyebrow="Kronika bohatera">
        {overview?.history.length ? <div className="mission-history">
          {overview.history.map((attempt) => <MissionHistoryRow key={attempt.id} attempt={attempt} />)}
        </div> : <EmptyState title="Kronika jest jeszcze pusta">Pierwsza opowieść zostanie zapisana po powrocie bohatera.</EmptyState>}
      </GamePanel>
      {sequenceOpen ? <ExpeditionSequence result={missionMutation.data ?? null} onComplete={() => {
        setSequenceOpen(false);
      }} /> : null}
    </div>
  );
}

function MissionHistoryRow({ attempt }: { attempt: MissionAttempt }) {
  const won = attempt.result === 'SUCCESS';
  return <article>
    <span className={`mission-history-result ${won ? 'mission-history-win' : 'mission-history-loss'}`}>{won ? 'Sukces' : 'Porażka'}</span>
    <div><h3>{attempt.title}</h3><p>Typ {attempt.tier} · {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.createdAt))}</p></div>
    <div className="mission-history-reward game-number">{attempt.reputationChange !== 0 ? <><span className={attempt.reputationChange > 0 ? 'text-blue-300' : 'text-red-300'}>{attempt.reputationChange > 0 ? '+' : ''}{attempt.reputationChange} REP</span><span> · </span></> : null}{won ? `${formatInteger(attempt.goldReward)} monet · ${formatInteger(attempt.experienceReward)} XP` : `−${attempt.hpLost} HP`}</div>
  </article>;
}
