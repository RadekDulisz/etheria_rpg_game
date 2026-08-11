import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptTavernOffer, getTavern, purchaseTavernProvision, refreshTavernBoard } from '../../api/tavern.api';
import { ActionBubble } from '../../components/ui/ActionBubble';
import { ActionToast } from '../../components/ui/ActionToast';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { TavernDifficulty, TavernOffer, TavernProvisionCatalogEntry, TavernProvisionType } from '../../types/game';
import type { TavernOverview } from '../../types/game';
import { TavernQuestSequence } from './TavernQuestSequence';

const DIFFICULTY_COPY: Record<TavernDifficulty, { label: string; roman: string; description: string }> = {
  EASY: { label: 'Łatwe', roman: 'I', description: 'Krótki szlak i niewielkie ryzyko' },
  MEDIUM: { label: 'Średnie', roman: 'II', description: 'Kilka prób i pewne starcie' },
  HARD: { label: 'Trudne', roman: 'III', description: 'Wielowątkowa historia i unikatowy wróg' },
};

export function TavernView() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadout, setLoadout] = useState<Partial<Record<TavernProvisionType, number>>>({});
  const tavernQuery = useQuery({ queryKey: ['tavern'], queryFn: getTavern, retry: false });
  const tavern = tavernQuery.data;
  const selected = tavern?.board.offers.find((offer) => offer.id === selectedId)
    ?? tavern?.board.offers[0]
    ?? null;

  useEffect(() => {
    if (!tavern?.board.offers.length) return;
    if (selectedId && tavern.board.offers.some((offer) => offer.id === selectedId)) return;
    const timer = window.setTimeout(() => setSelectedId(tavern.board.offers[0].id), 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, tavern?.board.offers]);

  const refreshMutation = useMutation({
    mutationFn: refreshTavernBoard,
    onSuccess: async (result) => {
      queryClient.setQueryData(['tavern'], result);
      setSelectedId(result.board.offers[0]?.id ?? null);
      setNotice('Borwin zawiesił na tablicy trzy nowe zlecenia.');
      await queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });
  const acceptMutation = useMutation({
    mutationFn: ({ offerId, provisions }: { offerId: string; provisions: Array<{ type: TavernProvisionType; quantity: number }> }) => acceptTavernOffer(offerId, provisions),
    onSuccess: (quest) => {
      queryClient.setQueryData(['tavern', 'active'], quest);
      queryClient.setQueryData<TavernOverview>(['tavern'], (current) => current ? {
        ...current,
        activeQuest: quest,
        board: { ...current.board, offers: current.board.offers.filter((offer) => offer.id !== selectedId) },
      } : current);
    },
  });
  const purchaseMutation = useMutation({
    mutationFn: ({ type }: { type: TavernProvisionType }) => purchaseTavernProvision(type),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(['tavern'], result);
      const provision = result.provisions.catalog.find((entry) => entry.type === variables.type);
      setNotice(`${provision?.name ?? 'Prowiant'} trafia do magazynu Miry.`);
      await queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
  });

  if (tavernQuery.isLoading) {
    return <div className="view-enter"><EmptyState title="Drzwi karczmy otwierają się">Z wnętrza dobiega trzask paleniska i gwar rozmów.</EmptyState></div>;
  }
  if (tavernQuery.isError || !tavern) {
    return <div className="view-enter"><EmptyState title="Karczma pozostaje zamknięta">{getApiErrorMessage(tavernQuery.error)}</EmptyState></div>;
  }

  const refreshCost = tavern.board.nextRefreshCost;
  const canAffordRefresh = refreshCost !== null && BigInt(tavern.gold) >= BigInt(refreshCost);

  return (
    <div className="view-enter tavern-view">
      <SectionTitle
        eyebrow="Wieści z pogranicza"
        title={tavern.inn.name}
        description="Wysłuchaj opowieści Borwina, wybierz kontrakt i przygotuj się na wyprawę, której przebieg zależy od Twoich decyzji."
      />

      <section className="tavern-hero" aria-label="Wnętrze Karczmy pod Złamanym Gryfem">
        <img src={tavern.inn.illustrationUrl} alt="Mroczna średniowieczna karczma pełna podróżników i najemników" />
        <div className="tavern-hero-shade" />
        <article>
          <span>Przy południowej bramie Etherii</span>
          <h2>Każda opowieść ma swoją cenę.</h2>
          <p><strong>{tavern.inn.innkeeper}</strong> zna szlaki, których nie ma na mapach. <strong>{tavern.inn.server}</strong> pamięta zaś słowa, których inni woleliby nie wypowiadać.</p>
        </article>
      </section>

      <section className="tavern-board-header">
        <div>
          <span>Tablica Borwina</span>
          <h2>Zlecenia czekające na ostrze</h2>
          <p>Nowe wieści dotrą naturalnie {formatExpiry(tavern.board.expiresAt)}.</p>
        </div>
        <div className="tavern-refresh">
          <small>Pozostałe odświeżenia: {tavern.board.refreshesRemaining}/3</small>
          <Button
            variant="secondary"
            disabled={refreshMutation.isPending || refreshCost === null || !canAffordRefresh}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? 'Borwin szuka wieści…' : refreshCost ? <>Nowe zlecenia · <CurrencyAmount value={refreshCost} compact /></> : 'Brak nowych wieści'}
          </Button>
          {refreshCost && !canAffordRefresh ? <em>W sakwie brakuje złota.</em> : null}
        </div>
      </section>

      <div className="tavern-contract-layout">
        <div className="tavern-contract-list" role="list" aria-label="Dostępne zlecenia">
          {tavern.board.offers.map((offer) => (
            <ContractCard key={offer.id} offer={offer} selected={selected?.id === offer.id} onSelect={() => setSelectedId(offer.id)} />
          ))}
        </div>
        {selected ? <ContractDetails
          offer={selected}
          pending={acceptMutation.isPending}
          error={acceptMutation.error}
          bagUsed={Object.values(loadout).reduce((total, quantity) => total + (quantity ?? 0), 0)}
          bagCapacity={tavern.provisions.bagCapacity}
          onAccept={() => acceptMutation.mutate({
            offerId: selected.id,
            provisions: Object.entries(loadout).filter(([, quantity]) => (quantity ?? 0) > 0).map(([type, quantity]) => ({ type: type as TavernProvisionType, quantity: quantity ?? 0 })),
          })}
          onDismissError={() => acceptMutation.reset()}
        /> : null}
      </div>

      <TavernProvisionsPanel
        catalog={tavern.provisions.catalog}
        capacity={tavern.provisions.bagCapacity}
        loadout={loadout}
        buying={purchaseMutation.isPending ? purchaseMutation.variables?.type ?? null : null}
        onBuy={(type) => purchaseMutation.mutate({ type })}
        onChange={(type, value) => setLoadout((current) => ({ ...current, [type]: value }))}
      />

      <TavernChronicle chronicle={tavern.chronicle} />

      {notice ? <ActionToast placement="bottom" onDismiss={() => setNotice(null)}>{notice}</ActionToast> : null}
      {refreshMutation.error ? <ActionToast placement="bottom" tone="error" onDismiss={() => refreshMutation.reset()}>{getApiErrorMessage(refreshMutation.error)}</ActionToast> : null}
      {purchaseMutation.error ? <ActionToast placement="bottom" tone="error" onDismiss={() => purchaseMutation.reset()}>{getApiErrorMessage(purchaseMutation.error)}</ActionToast> : null}
      {tavern.activeQuest ? <TavernQuestSequence quest={tavern.activeQuest} onClose={() => acceptMutation.reset()} /> : null}
    </div>
  );
}

function TavernChronicle({ chronicle }: { chronicle: TavernOverview['chronicle'] }) {
  return <section className="tavern-chronicle">
    <header>
      <div>
        <span>Księga Borwina</span>
        <h2>Kronika przebytych szlaków</h2>
        <p>Każda historia pamięta najlepsze zakończenie. Relikt można zdobyć tylko przy pierwszym zwycięstwie w danym zleceniu.</p>
      </div>
      <strong><b>{chronicle.discovered}</b> / {chronicle.total}<small>odkrytych opowieści</small></strong>
    </header>
    <div className="tavern-chronicle-grid">
      {chronicle.entries.map((entry, index) => <article key={entry.templateKey} className={entry.discovered ? 'is-discovered' : 'is-locked'}>
        <span className="tavern-chronicle-number">{String(index + 1).padStart(2, '0')}</span>
        {entry.discovered ? <>
          <div className="tavern-chronicle-copy">
            <small>{entry.region}</small>
            <h3>{entry.title}</h3>
            <p>{entry.bestEndingTitle ?? 'Zapis bez rozstrzygnięcia'}</p>
            <dl>
              <div><dt>Próby</dt><dd>{entry.completions}</dd></div>
              <div><dt>Zwycięstwa</dt><dd>{entry.successes}</dd></div>
              <div><dt>Najlepszy wynik</dt><dd>{entry.bestScore}</dd></div>
            </dl>
            <details className="tavern-chronicle-endings">
              <summary>Odkryte zakończenia <b>{entry.endings?.length ?? 0}/4</b></summary>
              <ul>{entry.endings?.map((ending) => <li key={ending.endingKey}><span>{ending.endingTitle}</span><small>{ending.timesReached > 1 ? `osiągnięto ${ending.timesReached}×` : 'odkryto'} · wynik {ending.bestScore}</small></li>)}</ul>
            </details>
          </div>
          <div className={`tavern-chronicle-relic ${entry.relicClaimed ? 'is-claimed' : ''}`}>
            {entry.relicItem ? <ItemIcon item={entry.relicItem} /> : <i />}
            <span>{entry.relicItem?.name ?? 'Relikt niezdobyty'}</span>
          </div>
        </> : <div className="tavern-chronicle-copy"><small>Nieodkryty szlak</small><h3>Nieznana opowieść</h3><p>Wieść o tym zleceniu nie trafiła jeszcze do kroniki.</p></div>}
      </article>)}
    </div>
  </section>;
}

function ContractCard({ offer, selected, onSelect }: { offer: TavernOffer; selected: boolean; onSelect: () => void }) {
  const difficulty = DIFFICULTY_COPY[offer.difficulty];
  return (
    <button type="button" role="listitem" className={`tavern-contract-card tavern-contract-${offer.difficulty.toLowerCase()} ${selected ? 'active' : ''}`} onClick={onSelect}>
      <span className="tavern-contract-mark">{difficulty.roman}</span>
      <span className="tavern-contract-copy">
        <small>{difficulty.label} · {offer.region}</small>
        <strong>{offer.title}</strong>
        <em>{difficulty.description}</em>
      </span>
      <b>{offer.stageCount} etapy</b>
    </button>
  );
}

function ContractDetails({ offer, pending, error, bagUsed, bagCapacity, onAccept, onDismissError }: { offer: TavernOffer; pending: boolean; error: unknown; bagUsed: number; bagCapacity: number; onAccept: () => void; onDismissError: () => void }) {
  const difficulty = DIFFICULTY_COPY[offer.difficulty];
  return (
    <article className={`tavern-contract-details tavern-contract-${offer.difficulty.toLowerCase()}`}>
      <header>
        <div><span>{difficulty.label} zlecenie</span><small>{offer.region}</small></div>
        <b>Poziom {offer.recommendedLevel}+</b>
      </header>
      <h2>{offer.title}</h2>
      <p className="tavern-contract-story">{offer.summary}</p>
      <div className="tavern-encounter-preview"><small>PRZEWIDYWANY PRZEBIEG</small><p>{offer.encounterSummary}</p></div>
      <dl className="tavern-contract-rewards">
        <div><dt>Złoto</dt><dd><CurrencyAmount value={offer.goldMin} compact />–<CurrencyAmount value={offer.goldMax} compact /></dd></div>
        <div><dt>Doświadczenie</dt><dd>{offer.experienceMin}–{offer.experienceMax} XP</dd></div>
        <div><dt>Szansa na przedmiot</dt><dd>{offer.itemChance}%</dd></div>
        <div><dt>Szansa na klejnot</dt><dd>{offer.gemChance}%</dd></div>
      </dl>
      <div className="tavern-risk-line"><span>Ryzyko ran</span><b>{offer.hpRiskMinPercent}–{offer.hpRiskMaxPercent}% HP</b></div>
      <footer>
        <p>Po przyjęciu kontraktu decyzje zostają zapisane. Przygotowana sakwa: <strong>{bagUsed}/{bagCapacity}</strong> miejsc.</p>
        <div className="action-feedback-anchor">
          <Button fullWidth disabled={pending} onClick={onAccept}>{pending ? 'Borwin zapisuje imię…' : 'Przyjmij zlecenie'}</Button>
          {error ? <ActionBubble onDismiss={onDismissError}>{getApiErrorMessage(error)}</ActionBubble> : null}
        </div>
      </footer>
    </article>
  );
}

function TavernProvisionsPanel({ catalog, capacity, loadout, buying, onBuy, onChange }: {
  catalog: TavernProvisionCatalogEntry[];
  capacity: number;
  loadout: Partial<Record<TavernProvisionType, number>>;
  buying: TavernProvisionType | null;
  onBuy: (type: TavernProvisionType) => void;
  onChange: (type: TavernProvisionType, value: number) => void;
}) {
  const used = Object.values(loadout).reduce((total, quantity) => total + (quantity ?? 0), 0);
  return <section className="tavern-provisions-shop">
    <header>
      <div><span>Zapasy Miry</span><h2>Przygotuj sakwę przed drogą</h2><p>Zakupione zapasy pozostają w magazynie. Do jednego zlecenia możesz zabrać łącznie trzy sztuki.</p></div>
      <strong><small>Sakwa wyprawowa</small>{used}/{capacity}</strong>
    </header>
    <div className="tavern-provision-catalog">
      {catalog.map((entry) => {
        const selected = loadout[entry.type] ?? 0;
        const canAdd = selected < entry.maxPerQuest && selected < entry.owned && used < capacity;
        return <article key={entry.type} className={`tavern-provision-card provision-${entry.type.toLowerCase()}`}>
          <div className="tavern-provision-icon"><i /><span>{entry.type === 'HEALING_POTION' ? 'HP' : entry.type === 'TRAVEL_BANDAGE' ? '+' : 'V'}</span></div>
          <div className="tavern-provision-info"><span>{entry.effectLabel}</span><h3>{entry.name}</h3><p>{entry.description}</p><small>W magazynie: <b>{entry.owned}</b> · limit: {entry.maxPerQuest}</small></div>
          <div className="tavern-provision-actions">
            <button type="button" disabled={buying !== null} onClick={() => onBuy(entry.type)}>{buying === entry.type ? 'Mira pakuje…' : <>Kup <CurrencyAmount value={entry.price} compact /></>}</button>
            <div aria-label={`Liczba ${entry.name} w sakwie`}><button type="button" disabled={selected <= 0} onClick={() => onChange(entry.type, selected - 1)}>−</button><strong>{selected}</strong><button type="button" disabled={!canAdd} onClick={() => onChange(entry.type, selected + 1)}>+</button></div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
