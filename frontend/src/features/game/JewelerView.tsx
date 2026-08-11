import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  combineJewelerGems,
  extractJewelerGem,
  getJewelerWorkshop,
} from '../../api/jeweler.api';
import { Button } from '../../components/ui/Button';
import { ActionToast } from '../../components/ui/ActionToast';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GemIcon } from '../../components/ui/GemIcon';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type {
  GemDefinition,
  GemStack,
  GemTier,
  Item,
  JewelerItem,
  JewelerRecipe,
} from '../../types/game';
import { GEM_FAMILY_LABELS, GEM_TIER_LABELS, gemEffects } from './gem-display';

type JewelerMode = 'COMBINE' | 'EXTRACT';
type CombineEffect = 'working' | 'success' | null;
type ExtractionEffect = { key: string; gem: GemDefinition } | null;

const GEM_POWER: Record<GemTier, number> = {
  SHARD: 1,
  CUT: 2,
  FLAWLESS: 3,
  ROYAL: 4,
  ANCIENT: 6,
};

const GEM_HEALTH: Record<GemTier, number> = {
  SHARD: 4,
  CUT: 8,
  FLAWLESS: 12,
  ROYAL: 18,
  ANCIENT: 26,
};

export function JewelerView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<JewelerMode>('COMBINE');
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [combineCount, setCombineCount] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSocket, setSelectedSocket] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [combineEffect, setCombineEffect] = useState<CombineEffect>(null);
  const [extractEffect, setExtractEffect] = useState<ExtractionEffect>(null);

  const workshopQuery = useQuery({
    queryKey: ['jeweler', 'workshop'],
    queryFn: getJewelerWorkshop,
    retry: false,
  });
  const workshop = workshopQuery.data;

  const selectedStack = useMemo(() => {
    if (!workshop?.gems.length) return null;
    return workshop.gems.find((stack) => stack.gemDefinitionId === selectedGemId)
      ?? workshop.gems.find((stack) => workshop.recipes.some((recipe) => recipe.inputGem.id === stack.gemDefinitionId))
      ?? workshop.gems[0];
  }, [selectedGemId, workshop]);
  const selectedRecipe = workshop?.recipes.find(
    (recipe) => recipe.inputGem.id === selectedStack?.gemDefinitionId,
  ) ?? null;
  const maximumCombines = selectedStack && selectedRecipe
    ? Math.floor(selectedStack.quantity / selectedRecipe.inputQuantity)
    : 0;

  const selectedItem = workshop?.socketedItems.find((item) => item.id === selectedItemId)
    ?? workshop?.socketedItems[0]
    ?? null;
  const filledSockets = selectedItem?.sockets.filter((socket) => socket.gemDefinition) ?? [];
  const activeSocket = filledSockets.find((socket) => socket.position === selectedSocket)
    ?? filledSockets[0]
    ?? null;

  useEffect(() => {
    if (combineEffect !== 'success') return;
    const timer = window.setTimeout(() => setCombineEffect(null), 1_050);
    return () => window.clearTimeout(timer);
  }, [combineEffect]);

  async function refreshJeweler() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jeweler', 'workshop'] }),
      queryClient.invalidateQueries({ queryKey: ['blacksmith', 'workshop'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['arena', 'opponent'] }),
    ]);
  }

  const combineMutation = useMutation({
    mutationFn: async ({ recipe, count }: { recipe: JewelerRecipe; count: number }) => {
      setCombineEffect('working');
      const [result] = await Promise.all([
        combineJewelerGems(recipe.inputGem.id, count),
        new Promise((resolve) => window.setTimeout(resolve, 850)),
      ]);
      return result;
    },
    onSuccess: async (result) => {
      setCombineEffect('success');
      setSelectedGemId(result.inputGem.id);
      setCombineCount(1);
      setNotice(`Powstało ${result.createdQuantity} × ${result.resultGem.name}.`);
      await refreshJeweler();
    },
    onError: () => setCombineEffect(null),
  });

  const extractMutation = useMutation({
    mutationFn: async ({ item, position, gem }: { item: JewelerItem; position: number; gem: GemDefinition }) => {
      setExtractEffect({ key: `${item.id}:${position}`, gem });
      const [result] = await Promise.all([
        extractJewelerGem(item.id, position),
        new Promise((resolve) => window.setTimeout(resolve, 1_450)),
      ]);
      return result;
    },
    onSuccess: async (result) => {
      setNotice(`${result.extractedGem.name} wrócił bezpiecznie do plecaka.`);
      await refreshJeweler();
      window.setTimeout(() => setExtractEffect(null), 650);
    },
    onError: () => setExtractEffect(null),
  });

  const error = combineMutation.error ?? extractMutation.error;
  const busy = combineMutation.isPending || extractMutation.isPending;

  return (
    <div className="view-enter jeweler-view">
      <SectionTitle
        eyebrow="Pracownia Mistrza Szlifu"
        title="Jubiler"
        description="Połącz słabsze kamienie w doskonalszy szlif albo odzyskaj klejnot z wyposażenia bez jego zniszczenia."
      />

      <section className="jeweler-hero" aria-label="Pracownia Mistrza Szlifu">
        <img src="/assets/jeweler/jeweler-workshop.png" alt="Jubiler badający klejnot w gotyckiej pracowni" />
        <div className="jeweler-hero-shade" />
        <div className="jeweler-hero-copy">
          <p>KAŻDY KAMIEŃ PAMIĘTA ŚWIATŁO</p>
          <h2>W każdym szlifie kryje się potęga.</h2>
          <span>Precyzja nie zna przypadku. Trzy zgodne kamienie zawsze tworzą jeden doskonalszy klejnot.</span>
        </div>
      </section>

      <div className="jeweler-tabs" role="tablist" aria-label="Usługi jubilera">
        <button type="button" className={mode === 'COMBINE' ? 'active' : ''} onClick={() => setMode('COMBINE')}>Łączenie klejnotów</button>
        <button type="button" className={mode === 'EXTRACT' ? 'active' : ''} onClick={() => setMode('EXTRACT')}>Odzyskiwanie klejnotów</button>
      </div>

      {notice ? <ActionToast placement="bottom" onDismiss={() => setNotice(null)}>{notice}</ActionToast> : null}
      {error ? <ActionToast placement="bottom" tone="error" onDismiss={() => { combineMutation.reset(); extractMutation.reset(); }}>{getApiErrorMessage(error)}</ActionToast> : null}
      {workshopQuery.isLoading ? <div className="jeweler-loading">Jubiler przygotowuje narzędzia…</div> : null}
      {workshopQuery.isError ? <EmptyState title="Pracownia pozostaje zamknięta">{getApiErrorMessage(workshopQuery.error)}</EmptyState> : null}

      {workshop && mode === 'COMBINE' ? (
        workshop.gems.length ? (
          <div className="jeweler-workbench">
            <GemCollection
              gems={workshop.gems}
              recipes={workshop.recipes}
              selectedId={selectedStack?.gemDefinitionId ?? null}
              onSelect={(id) => { setSelectedGemId(id); setCombineCount(1); }}
            />
            <CombineFocus stack={selectedStack} recipe={selectedRecipe} effect={combineEffect} />
            <CombineAction
              recipe={selectedRecipe}
              available={selectedStack?.quantity ?? 0}
              maximum={maximumCombines}
              count={Math.min(combineCount, Math.max(1, maximumCombines))}
              gold={workshop.gold}
              busy={busy}
              onCount={setCombineCount}
              onCombine={(count) => selectedRecipe && combineMutation.mutate({ recipe: selectedRecipe, count })}
            />
          </div>
        ) : <EmptyState title="Sakwa na kamienie jest pusta">Klejnoty można zdobywać podczas wypraw. Gdy znajdziesz trzy zgodne kamienie, Jubiler przygotuje kolejny szlif.</EmptyState>
      ) : null}

      {workshop && mode === 'EXTRACT' ? (
        workshop.socketedItems.length ? (
          <div className="jeweler-workbench jeweler-extract-workbench">
            <SocketedItemList items={workshop.socketedItems} selectedId={selectedItem?.id ?? null} onSelect={(id) => { setSelectedItemId(id); setSelectedSocket(0); }} />
            <ExtractionFocus item={selectedItem} activePosition={activeSocket?.position ?? 0} extracting={extractEffect} onSelectSocket={setSelectedSocket} />
            <ExtractionAction
              item={selectedItem}
              gem={activeSocket?.gemDefinition ?? null}
              cost={activeSocket?.gemDefinition ? workshop.extractionCosts[activeSocket.gemDefinition.tier] : '0'}
              gold={workshop.gold}
              busy={busy}
              onExtract={() => selectedItem && activeSocket?.gemDefinition && extractMutation.mutate({ item: selectedItem, position: activeSocket.position, gem: activeSocket.gemDefinition })}
            />
          </div>
        ) : <EmptyState title="Brak osadzonych klejnotów">Załóż klejnot u Kowala, a Jubiler będzie mógł później odzyskać go bez zniszczenia.</EmptyState>
      ) : null}
    </div>
  );
}

function GemCollection({ gems, recipes, selectedId, onSelect }: {
  gems: GemStack[];
  recipes: JewelerRecipe[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="jeweler-collection" aria-label="Kolekcja klejnotów">
      <p className="jeweler-column-title">Kolekcja klejnotów</p>
      <div className="jeweler-gem-list">
        {gems.map((stack) => {
          const canRefine = recipes.some((recipe) => recipe.inputGem.id === stack.gemDefinitionId);
          return (
            <button type="button" key={stack.gemDefinitionId} className={selectedId === stack.gemDefinitionId ? 'active' : ''} onClick={() => onSelect(stack.gemDefinitionId)}>
              <GemIcon gem={stack.gemDefinition} compact />
              <span><strong>{stack.gemDefinition.name}</strong><small>{GEM_TIER_LABELS[stack.gemDefinition.tier]}</small></span>
              <b>×{stack.quantity}</b>
              {!canRefine ? <em>MAKS.</em> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function CombineFocus({ stack, recipe, effect }: { stack: { gemDefinition: GemDefinition } | null; recipe: JewelerRecipe | null; effect: CombineEffect }) {
  if (!stack) return <main className="jeweler-focus" />;
  return (
    <main className={`jeweler-focus ${effect ? `jeweler-combining jeweler-combining-${effect}` : ''}`}>
      {effect ? <CombineAnimation input={stack.gemDefinition} result={recipe?.resultGem ?? stack.gemDefinition} effect={effect} /> : null}
      <p className="jeweler-column-title">Stół szlifierski</p>
      <div className="jeweler-recipe-visual" aria-label={recipe ? `Trzy klejnoty tworzą ${recipe.resultGem.name}` : 'Najwyższy szlif'}>
        <div className="jeweler-input-gems">
          {Array.from({ length: 3 }, (_, index) => <span key={index}><GemIcon gem={stack.gemDefinition} /></span>)}
        </div>
        <span className="jeweler-recipe-arrow" aria-hidden="true">→</span>
        <div className="jeweler-result-gem">
          {recipe ? <GemIcon gem={recipe.resultGem} /> : <GemIcon gem={stack.gemDefinition} />}
        </div>
      </div>
      <div className="jeweler-result-copy">
        <small>{recipe ? 'REZULTAT OBRÓBKI' : 'SZCZYT KUNSZTU'}</small>
        <h3>{recipe?.resultGem.name ?? stack.gemDefinition.name}</h3>
        <p>{recipe ? GEM_TIER_LABELS[recipe.resultGem.tier] : 'Ten klejnot osiągnął najwyższy dostępny szlif.'}</p>
      </div>
      <div className="jeweler-effect-list">
        {gemEffects(recipe?.resultGem ?? stack.gemDefinition).map((effectText) => <span key={effectText}>{effectText}</span>)}
      </div>
    </main>
  );
}

function CombineAnimation({ input, result, effect }: { input: GemDefinition; result: GemDefinition; effect: Exclude<CombineEffect, null> }) {
  return (
    <div className={`jeweler-combine-animation ${effect}`} aria-hidden="true">
      <span className="jeweler-enchant-column" />
      <span className="jeweler-enchant-bloom" />
      <span className="jeweler-enchant-circles"><i /><i /><i /></span>
      <span className="jeweler-enchant-rays">
        {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--jewel-angle': `${index * 30}deg` } as CSSProperties} />)}
      </span>
      <span className="jeweler-enchant-motes">
        {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--jewel-angle': `${index * 25.714}deg`, '--jewel-delay': `${80 + index * 18}ms` } as CSSProperties} />)}
      </span>
      <span className="jeweler-lens-glint" />
      <div className="jeweler-animation-stones">
        {Array.from({ length: 3 }, (_, index) => <i key={index}><GemIcon gem={input} compact /></i>)}
      </div>
      <b><GemIcon gem={result} /></b>
    </div>
  );
}

function CombineAction({ recipe, available, maximum, count, gold, busy, onCount, onCombine }: {
  recipe: JewelerRecipe | null;
  available: number;
  maximum: number;
  count: number;
  gold: string;
  busy: boolean;
  onCount: (value: number) => void;
  onCombine: (count: number) => void;
}) {
  if (!recipe) return <aside className="jeweler-action"><p className="jeweler-column-title">Doskonały szlif</p><div className="jeweler-action-empty">Nie istnieje wyższy stopień tego klejnotu.</div></aside>;
  const totalCost = BigInt(recipe.goldCost) * BigInt(count);
  const enoughGold = BigInt(gold) >= totalCost;
  const enoughGems = maximum >= 1;
  return (
    <aside className="jeweler-action">
      <p className="jeweler-column-title">Precyzyjna obróbka</p>
      <dl className="jeweler-action-details">
        <div><dt>Materiał</dt><dd>{recipe.inputQuantity * count} / {available}</dd></div>
        <div><dt>Otrzymasz</dt><dd className="jeweler-positive">{count} × {recipe.resultGem.name}</dd></div>
        <div><dt>Koszt</dt><dd><CurrencyAmount value={totalCost} /></dd></div>
      </dl>
      <div className="jeweler-count-row"><span>Liczba połączeń</span><QuantitySelector value={count} max={Math.max(1, maximum)} disabled={busy || maximum < 1} onChange={onCount} /></div>
      {!enoughGems ? <p className="jeweler-action-warning">Potrzebujesz co najmniej trzech zgodnych klejnotów.</p> : null}
      {!enoughGold ? <p className="jeweler-action-warning">W sakwie brakuje złota na tę obróbkę.</p> : null}
      <Button fullWidth disabled={busy || !enoughGems || !enoughGold} onClick={() => onCombine(count)}>{busy ? 'Jubiler pracuje…' : 'Połącz klejnoty'}</Button>
      <Button fullWidth variant="secondary" disabled={busy || !enoughGems || BigInt(gold) < BigInt(recipe.goldCost) * BigInt(maximum)} onClick={() => onCombine(maximum)}>Połącz maksymalnie ({maximum})</Button>
    </aside>
  );
}

function SocketedItemList({ items, selectedId, onSelect }: { items: JewelerItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <aside className="jeweler-collection" aria-label="Przedmioty z klejnotami">
      <p className="jeweler-column-title">Przedmioty z oprawą</p>
      <div className="jeweler-item-list">
        {items.map((entry) => (
          <button type="button" key={entry.id} className={selectedId === entry.id ? 'active' : ''} onClick={() => onSelect(entry.id)}>
            <span className={`jeweler-list-item-icon rarity-gem rarity-gem-${entry.item.rarity.toLowerCase()}`}><ItemIcon item={entry.item} /></span>
            <span><strong>{entry.item.name}{entry.enhancementLevel ? ` +${entry.enhancementLevel}` : ''}</strong><small>{entry.equippedSlot ? 'Założony' : 'W plecaku'} · {entry.sockets.filter((socket) => socket.gemDefinition).length} klejnotów</small></span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ExtractionFocus({ item, activePosition, extracting, onSelectSocket }: { item: JewelerItem | null; activePosition: number; extracting: ExtractionEffect; onSelectSocket: (position: number) => void }) {
  if (!item) return <main className="jeweler-focus" />;
  const filled = item.sockets.filter((socket) => socket.gemDefinition);
  return (
    <main className="jeweler-focus jeweler-extraction-focus">
      <p className="jeweler-column-title">Oprawiony przedmiot</p>
      <div className={`jeweler-selected-item rarity-gem rarity-gem-${item.item.rarity.toLowerCase()}`}><ItemIcon item={item.item} /></div>
      <div className="jeweler-item-title"><h3>{item.item.name}{item.enhancementLevel ? ` +${item.enhancementLevel}` : ''}</h3><GradeBadge grade={item.item.grade} /></div>
      <div className="jeweler-socket-row">
        {filled.map((socket) => (
          <button type="button" key={socket.position} className={`${activePosition === socket.position ? 'active' : ''} ${extracting?.key === `${item.id}:${socket.position}` ? 'extracting' : ''}`} onClick={() => onSelectSocket(socket.position)}>
            {socket.gemDefinition ? <GemIcon gem={socket.gemDefinition} /> : null}
            {extracting?.key === `${item.id}:${socket.position}` ? <ExtractionAnimation gem={extracting.gem} /> : null}
          </button>
        ))}
      </div>
      <p className="jeweler-socket-help">Wybierz klejnot, który ma zostać ostrożnie wyjęty z oprawy.</p>
    </main>
  );
}

function ExtractionAnimation({ gem }: { gem: GemDefinition }) {
  return (
    <div className="jeweler-extraction-animation" aria-hidden="true">
      <span className="jeweler-extraction-trail" />
      <span className="jeweler-extraction-sparks">
        {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--jewel-angle': `${index * 36}deg` } as CSSProperties} />)}
      </span>
      <b><GemIcon gem={gem} /></b>
      <span className="jeweler-extraction-socket-flash" />
    </div>
  );
}

function ExtractionAction({ item, gem, cost, gold, busy, onExtract }: { item: JewelerItem | null; gem: GemDefinition | null; cost: string; gold: string; busy: boolean; onExtract: () => void }) {
  if (!item || !gem) return <aside className="jeweler-action" />;
  const enoughGold = BigInt(gold) >= BigInt(cost);
  return (
    <aside className="jeweler-action">
      <p className="jeweler-column-title">Bezpieczne odzyskanie</p>
      <div className="jeweler-extracted-gem"><GemIcon gem={gem} /><span><small>{GEM_FAMILY_LABELS[gem.family]}</small><strong>{gem.name}</strong><em>{GEM_TIER_LABELS[gem.tier]}</em></span></div>
      <div className="jeweler-loss-preview"><small>PRZEDMIOT UTRACI</small>{gemLossForItem(gem, item.item).map((loss) => <span key={loss}>{loss}</span>)}</div>
      <dl className="jeweler-action-details"><div><dt>Koszt odzyskania</dt><dd><CurrencyAmount value={cost} /></dd></div></dl>
      <p className="jeweler-safe-note">Klejnot nie zostanie zniszczony. Po zabiegu wróci do plecaka, a gniazdo pozostanie odblokowane.</p>
      {!enoughGold ? <p className="jeweler-action-warning">Masz za mało złota.</p> : null}
      <Button fullWidth disabled={busy || !enoughGold} onClick={onExtract}>{busy ? 'Jubiler otwiera oprawę…' : 'Odzyskaj klejnot'}</Button>
    </aside>
  );
}

function gemLossForItem(gem: GemDefinition, item: Item): string[] {
  const value = GEM_POWER[gem.tier];
  const weapon = item.slotGroup === 'WEAPON';
  const shield = item.slotGroup === 'SHIELD_SIGIL';
  switch (gem.family) {
    case 'RUBY': return weapon ? [`−${value} ATK`, `−${value} do zakresu obrażeń`] : [`−${GEM_HEALTH[gem.tier]} HP`];
    case 'AMETHYST': return [weapon ? `−${value} STR` : `−${value} CON`];
    case 'EMERALD': return [shield ? `−${value} parowania` : `−${value} DEX`];
    case 'SAPPHIRE': return [shield ? `−${value} DEF` : `−${value} INT`];
  }
}
