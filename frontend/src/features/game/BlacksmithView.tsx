import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBlacksmithWorkshop,
  insertBlacksmithGem,
  unlockBlacksmithSocket,
  upgradeBlacksmithItem,
} from '../../api/blacksmith.api';
import { ActionToast } from '../../components/ui/ActionToast';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { GemIcon } from '../../components/ui/GemIcon';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import { formatSignedPercent, itemCritPercent, itemParryPercent } from '../../lib/combat-display';
import type { BlacksmithItem, GemDefinition, Item } from '../../types/game';

type WorkshopMode = 'UPGRADE' | 'SOCKETS';
type ForgeEffect = 'working' | 'success' | 'failure' | null;
export type ForgePreviewOutcome = 'success' | 'failure';
type SocketEffect = { itemId: string; position: number; family: GemDefinition['family']; tier: GemDefinition['tier']; nonce: number };

const familyLabels: Record<GemDefinition['family'], string> = {
  RUBY: 'Rubin',
  AMETHYST: 'Ametyst',
  EMERALD: 'Szmaragd',
  SAPPHIRE: 'Szafir',
};

const tierLabels: Record<GemDefinition['tier'], string> = {
  SHARD: 'Szlif krągły',
  CUT: 'Szlif poduszkowy',
  FLAWLESS: 'Szlif owalny',
  ROYAL: 'Szlif koronny',
  ANCIENT: 'Szlif pradawny',
};

export function BlacksmithView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<WorkshopMode>('UPGRADE');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSocket, setSelectedSocket] = useState(0);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgeEffect, setForgeEffect] = useState<ForgeEffect>(null);
  const [forgedLevel, setForgedLevel] = useState<number | null>(null);
  const [socketEffect, setSocketEffect] = useState<SocketEffect | null>(null);
  const workshopQuery = useQuery({
    queryKey: ['blacksmith', 'workshop'],
    queryFn: getBlacksmithWorkshop,
    retry: false,
  });
  const workshop = workshopQuery.data;
  const selectedItem = useMemo(
    () => workshop?.items.find((item) => item.id === selectedId) ?? workshop?.items[0] ?? null,
    [selectedId, workshop?.items],
  );

  useEffect(() => {
    if (!selectedId && workshop?.items[0]) setSelectedId(workshop.items[0].id);
  }, [selectedId, workshop?.items]);

  useEffect(() => {
    if (forgeEffect !== 'success' && forgeEffect !== 'failure') return;
    const timer = window.setTimeout(() => {
      setForgeEffect(null);
      setForgedLevel(null);
    }, 1_650);
    return () => window.clearTimeout(timer);
  }, [forgeEffect]);

  useEffect(() => {
    if (!socketEffect) return;
    const timer = window.setTimeout(() => setSocketEffect(null), 950);
    return () => window.clearTimeout(timer);
  }, [socketEffect]);

  async function refreshWorkshop() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['blacksmith', 'workshop'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['arena', 'opponent'] }),
    ]);
  }

  const upgradeMutation = useMutation({
    mutationFn: async (ownedItemId: string) => {
      setForgeEffect('working');
      const [result] = await Promise.all([
        upgradeBlacksmithItem(ownedItemId),
        new Promise((resolve) => window.setTimeout(resolve, 1_050)),
      ]);
      return result;
    },
    onSuccess: async (result) => {
      setForgedLevel(result.success ? result.item.enhancementLevel : null);
      setForgeEffect(result.success ? 'success' : 'failure');
      setNotice(result.success
        ? `Ulepszenie zakończone powodzeniem. ${result.item.item.name} osiąga +${result.item.enhancementLevel}.`
        : `Próba nie powiodła się. Następna szansa została zwiększona.`);
      await refreshWorkshop();
    },
    onError: () => setForgeEffect(null),
  });
  const socketMutation = useMutation({
    mutationFn: (ownedItemId: string) => unlockBlacksmithSocket(ownedItemId),
    onSuccess: async () => {
      setNotice('Kowal wykuł i odblokował nowe gniazdo.');
      await refreshWorkshop();
    },
  });
  const gemMutation = useMutation({
    mutationFn: ({ item, gem, position }: { item: BlacksmithItem; gem: GemDefinition; position: number }) => insertBlacksmithGem(
      item.id,
      position,
      gem.id,
      Boolean(item.sockets.find((socket) => socket.position === position)?.gemDefinitionId),
    ),
    onSuccess: async (_, variables) => {
      setSocketEffect({ itemId: variables.item.id, position: variables.position, family: variables.gem.family, tier: variables.gem.tier, nonce: Date.now() });
      setNotice(`${variables.gem.name} został oprawiony w przedmiocie ${variables.item.item.name}.`);
      await refreshWorkshop();
    },
  });

  const mutationError = upgradeMutation.error ?? socketMutation.error ?? gemMutation.error;
  const ownedGems = workshop?.gems ?? [];
  const selectedGem = ownedGems.find((stack) => stack.gemDefinitionId === selectedGemId)?.gemDefinition ?? null;
  const busy = upgradeMutation.isPending || socketMutation.isPending || gemMutation.isPending;

  return (
    <div className="view-enter blacksmith-view">
      <SectionTitle
        eyebrow="Kuźnia Czarnego Żaru"
        title="Kowal"
        description="Wzmocnij oręż, wykuj gniazda i opraw klejnoty. Każda zmiana dotyczy jednego, konkretnego egzemplarza przedmiotu."
      />
      {notice ? <ActionToast onDismiss={() => setNotice(null)}>{notice}</ActionToast> : null}
      {mutationError ? <ActionToast onDismiss={() => { upgradeMutation.reset(); socketMutation.reset(); gemMutation.reset(); }}>{getApiErrorMessage(mutationError)}</ActionToast> : null}

      <section className="blacksmith-hero" aria-label="Kuźnia Czarnego Żaru">
        <img src="/assets/blacksmith/blacksmith-forge.png" alt="Mroczna kuźnia wykuta w kamieniu" />
        <div className="blacksmith-hero-shade" />
        <div className="blacksmith-hero-copy">
          <p>ŻAR NIE PYTA O CENĘ</p>
          <h2>Stal pamięta każde uderzenie.</h2>
          <span>Kowal nie niszczy przedmiotów przy nieudanej próbie. Kolejne podejście otrzymuje większą szansę powodzenia.</span>
        </div>
      </section>

      <div className="blacksmith-tabs" role="tablist" aria-label="Usługi kowala">
        <button className={mode === 'UPGRADE' ? 'active' : ''} onClick={() => setMode('UPGRADE')} type="button">Ulepszanie</button>
        <button className={mode === 'SOCKETS' ? 'active' : ''} onClick={() => setMode('SOCKETS')} type="button">Gniazda i klejnoty</button>
      </div>

      {workshopQuery.isLoading ? <div className="blacksmith-loading">Kowal rozgrzewa palenisko…</div> : null}
      {workshopQuery.isError ? <EmptyState title="Kuźnia pozostaje zamknięta">{getApiErrorMessage(workshopQuery.error)}</EmptyState> : null}
      {workshop && !workshop.items.length ? <EmptyState title="Brak wyposażenia">Kowal może pracować nad bronią, tarczą i częściami pancerza.</EmptyState> : null}

      {workshop && selectedItem ? (
        <div className="blacksmith-workbench">
          <aside className="blacksmith-item-list" aria-label="Przedmioty do obróbki">
            <p className="blacksmith-column-title">Wybierz przedmiot</p>
            {workshop.items.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={entry.id === selectedItem.id ? 'active' : ''}
                onClick={() => { setSelectedId(entry.id); setSelectedSocket(0); }}
              >
                <span className={`blacksmith-list-icon rarity-gem rarity-gem-${entry.item.rarity.toLowerCase()}`}><ItemIcon item={entry.item} /></span>
                <span className="blacksmith-list-copy">
                  <strong>{entry.item.name}{entry.enhancementLevel ? ` +${entry.enhancementLevel}` : ''}</strong>
                  <small>{entry.equippedSlot ? 'Założony' : 'W plecaku'} · {entry.item.grade.replace('_', ' ')}</small>
                </span>
                <span className="blacksmith-socket-count">{entry.unlockedSockets}/{entry.socketCapacity}</span>
              </button>
            ))}
          </aside>

          <main className={`blacksmith-focus ${forgeEffect ? `blacksmith-focus-forging forge-effect-${forgeEffect}` : ''}`}>
            {forgeEffect ? <ForgeAnimation effect={forgeEffect} level={forgedLevel} /> : null}
            <div className={`blacksmith-item-icon rarity-gem rarity-gem-${selectedItem.item.rarity.toLowerCase()}`}><ItemIcon item={selectedItem.item} /></div>
            <div className="blacksmith-item-heading">
              <h3>{selectedItem.item.name}{selectedItem.enhancementLevel > 0 ? <strong> +{selectedItem.enhancementLevel}</strong> : null}</h3>
              <GradeBadge grade={selectedItem.item.grade} />
            </div>
            {mode === 'UPGRADE' && selectedItem.upgrade
              ? <UpgradeStatsPreview item={selectedItem} />
              : mode === 'SOCKETS' && selectedGem
                ? <GemStatsPreview item={selectedItem} gem={selectedGem} position={selectedSocket} />
                : <ItemStats item={selectedItem.item} />}

            <div className="blacksmith-sockets" aria-label="Gniazda przedmiotu">
              {Array.from({ length: selectedItem.socketCapacity }, (_, position) => {
                const socket = selectedItem.sockets.find((entry) => entry.position === position);
                const unlocked = position < selectedItem.unlockedSockets;
                return (
                  <button
                    key={position}
                    type="button"
                    disabled={!unlocked}
                    className={`${unlocked ? 'unlocked' : 'locked'} ${selectedSocket === position ? 'active' : ''} ${socket?.gemDefinition ? `gem-${socket.gemDefinition.family.toLowerCase()}` : ''}`}
                    onClick={() => setSelectedSocket(position)}
                    title={socket?.gemDefinition?.name ?? (unlocked ? 'Puste gniazdo' : 'Zamknięte gniazdo')}
                  >
                    {socket?.gemDefinition ? <GemIcon gem={socket.gemDefinition} compact /> : <span>{unlocked ? '◇' : '×'}</span>}
                    {socketEffect?.itemId === selectedItem.id && socketEffect.position === position
                      ? <SocketGemEffect key={socketEffect.nonce} family={socketEffect.family} tier={socketEffect.tier} />
                      : null}
                  </button>
                );
              })}
              {!selectedItem.socketCapacity ? <span className="text-sm text-stone-500">Ten rodzaj przedmiotu nie posiada gniazd.</span> : null}
            </div>
          </main>

          <aside className="blacksmith-action">
            {mode === 'UPGRADE' ? (
              <UpgradeAction item={selectedItem} busy={busy} onUpgrade={() => upgradeMutation.mutate(selectedItem.id)} />
            ) : (
              <SocketAction
                item={selectedItem}
                gems={ownedGems}
                selectedSocket={selectedSocket}
                selectedGemId={selectedGemId}
                selectedGem={selectedGem}
                busy={busy}
                onSelectGem={setSelectedGemId}
                onUnlock={() => socketMutation.mutate(selectedItem.id)}
                onInsert={() => selectedGem && gemMutation.mutate({ item: selectedItem, gem: selectedGem, position: selectedSocket })}
              />
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ForgeAnimation({ effect, level }: { effect: Exclude<ForgeEffect, null>; level: number | null }) {
  return (
    <div className="blacksmith-forge-animation" aria-live="polite" aria-label={effect === 'working' ? 'Kowal ulepsza przedmiot' : effect === 'success' ? 'Ulepszenie zakończone powodzeniem' : 'Próba ulepszenia nie powiodła się'}>
      <span className="forge-animation-shade" />
      <span className="forge-enchant-rings" aria-hidden="true"><i /><i /><i /></span>
      <span className="forge-enchant-runes" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--rune-index': index } as CSSProperties} />)}
      </span>
      <span className="forge-enchant-rays" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--ray-index': index } as CSSProperties} />)}
      </span>
      <span className="forge-animation-flash" />
      <span className="forge-animation-sparks" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => <i key={index} style={{ '--spark-index': index } as CSSProperties} />)}
      </span>
      {effect === 'success' ? <strong className="forge-animation-result">WYKUTE <b>+{level}</b></strong> : null}
      {effect === 'failure' ? <strong className="forge-animation-result forge-animation-result-failure">STAL OPARŁA SIĘ</strong> : null}
    </div>
  );
}

export function BlacksmithForgePreview({ outcome }: { outcome: ForgePreviewOutcome }) {
  const [effect, setEffect] = useState<Exclude<ForgeEffect, null>>('working');
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    setEffect('working');
    const resultTimer = window.setTimeout(() => setEffect(outcome), 1_050);
    const replayTimer = window.setTimeout(() => setSequence((value) => value + 1), 3_450);
    return () => {
      window.clearTimeout(resultTimer);
      window.clearTimeout(replayTimer);
    };
  }, [outcome, sequence]);

  return (
    <main className="blacksmith-preview-screen">
      <div className="blacksmith-preview-backdrop" aria-hidden="true" />
      <section className="blacksmith-preview-workbench">
        <p>KUŹNIA CZARNEGO ŻARU</p>
        <h1>Hartowanie stali</h1>
        <div className={`blacksmith-focus blacksmith-preview-focus blacksmith-focus-forging forge-effect-${effect}`}>
          <ForgeAnimation key={`${outcome}-${sequence}-${effect}`} effect={effect} level={outcome === 'success' ? 3 : null} />
          <div className="blacksmith-item-icon rarity-gem rarity-gem-rare" aria-hidden="true">
            <span className="blacksmith-preview-blade">†</span>
          </div>
          <div className="blacksmith-item-heading">
            <h3>Ostrze Srebrnego Traktu <strong>+2</strong></h3>
            <span className="grade-badge">NOWICJUSZ</span>
          </div>
          <small>Sekwencja odtwarza się automatycznie</small>
        </div>
      </section>
    </main>
  );
}

function UpgradeStatsPreview({ item }: { item: BlacksmithItem }) {
  const current = item.item;
  const nextLevel = item.upgrade?.nextLevel ?? item.enhancementLevel;
  const currentLevel = item.enhancementLevel;
  const base = item.baseItem;
  const next: Item = { ...current };
  const upgradedValue = (value: number, level: number) => {
    if (value <= 0 || level <= 0) return value;
    return value + Math.max(level, Math.floor(value * level * 0.025));
  };
  const addUpgradeDelta = (key: 'attackPower' | 'damageMin' | 'damageMax' | 'defensePower') => {
    next[key] += upgradedValue(base[key], nextLevel) - upgradedValue(base[key], currentLevel);
  };

  if (base.slotGroup === 'WEAPON') {
    addUpgradeDelta('attackPower');
    addUpgradeDelta('damageMin');
    addUpgradeDelta('damageMax');
  } else {
    addUpgradeDelta('defensePower');
  }

  const rows: Array<{ label: string; current: string; next?: string }> = [];
  const numeric = (label: string, currentValue: number, nextValue = currentValue, suffix = '') => {
    if (currentValue === 0 && nextValue === 0) return;
    rows.push({
      label,
      current: `${currentValue > 0 && ['Siła', 'Zręczność', 'Wytrzymałość', 'Inteligencja', 'Punkty życia'].includes(label) ? '+' : ''}${currentValue}${suffix}`,
      next: nextValue !== currentValue ? `${nextValue}${suffix}` : undefined,
    });
  };

  if (current.damageMax > 0) rows.push({
    label: 'Obrażenia',
    current: `${current.damageMin}–${current.damageMax}`,
    next: next.damageMin !== current.damageMin || next.damageMax !== current.damageMax
      ? `${next.damageMin}–${next.damageMax}`
      : undefined,
  });
  numeric('Atak', current.attackPower, next.attackPower);
  numeric('Obrona', current.defensePower, next.defensePower);
  numeric('Siła', current.strengthBonus);
  numeric('Zręczność', current.agilityBonus);
  numeric('Wytrzymałość', current.enduranceBonus);
  numeric('Inteligencja', current.intelligenceBonus);
  numeric('Punkty życia', current.maxHpBonus, current.maxHpBonus, ' HP');
  if (current.parryBonus !== 0) rows.push({ label: 'Parowanie', current: formatSignedPercent(itemParryPercent(current.parryBonus)) });
  if (current.criticalChanceBonus !== 0) rows.push({ label: 'Trafienie krytyczne', current: formatSignedPercent(itemCritPercent(current.criticalChanceBonus)) });

  return (
    <dl className="blacksmith-upgrade-preview" aria-label={`Statystyki po ulepszeniu do +${nextLevel}`}>
      {rows.map((row) => (
        <div key={row.label} className={row.next ? 'will-change' : ''}>
          <dt>{row.label}</dt>
          <dd className="game-number">
            <span>{row.current}</span>
            {row.next ? <><i aria-hidden="true">→</i><strong>{row.next}</strong></> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function UpgradeAction({ item, busy, onUpgrade }: { item: BlacksmithItem; busy: boolean; onUpgrade: () => void }) {
  if (!item.upgrade) return <div className="blacksmith-action-empty"><strong>Limit rangi osiągnięty</strong><p>Przedmiot tej rangi można ulepszyć maksymalnie do +{item.enhancementLimit}.</p></div>;
  return (
    <div>
      <p className="blacksmith-column-title">Hartowanie stali</p>
      <div className="blacksmith-level-change"><span>+{item.enhancementLevel}</span><i>→</i><strong>+{item.upgrade.nextLevel}</strong></div>
      <dl className="blacksmith-action-details">
        <div><dt>Szansa powodzenia</dt><dd>{item.upgrade.successChancePercent}%</dd></div>
        <div><dt>Limit rangi</dt><dd>+{item.enhancementLimit}</dd></div>
        <div><dt>Koszt</dt><dd><CurrencyAmount value={item.upgrade.goldCost} /></dd></div>
      </dl>
      <p className="blacksmith-warning">Niepowodzenie nie niszczy przedmiotu. Zwiększa szansę następnej próby o 10 punktów procentowych.</p>
      <Button fullWidth disabled={busy} onClick={onUpgrade}>
        {busy ? 'Kucie…' : 'Uderz młotem'}
      </Button>
    </div>
  );
}

function SocketAction({ item, gems, selectedSocket, selectedGemId, selectedGem, busy, onSelectGem, onUnlock, onInsert }: {
  item: BlacksmithItem;
  gems: Array<{ gemDefinitionId: string; quantity: number; gemDefinition: GemDefinition }>;
  selectedSocket: number;
  selectedGemId: string | null;
  selectedGem: GemDefinition | null;
  busy: boolean;
  onSelectGem: (id: string) => void;
  onUnlock: () => void;
  onInsert: () => void;
}) {
  const socketUnlocked = selectedSocket < item.unlockedSockets;
  const currentGem = item.sockets.find((socket) => socket.position === selectedSocket)?.gemDefinition;
  const sameGemSelected = Boolean(currentGem && selectedGem && currentGem.id === selectedGem.id);
  return (
    <div>
      <p className="blacksmith-column-title">Oprawa klejnotów</p>
      {!socketUnlocked && item.nextSocket ? (
        <div className="blacksmith-unlock">
          <strong>Zamknięte gniazdo</strong>
          <p>Kowal może wykuć miejsce na kolejny klejnot. Operacja zawsze się udaje.</p>
          <Button fullWidth disabled={busy} onClick={onUnlock}>Odblokuj · <CurrencyAmount value={item.nextSocket.goldCost} compact /></Button>
        </div>
      ) : socketUnlocked ? (
        <>
          {currentGem
            ? <p className="blacksmith-replacement-warning">Zastąpienie bezpowrotnie zniszczy klejnot <strong>{currentGem.name}</strong>. Nie wróci on do sakwy.</p>
            : <p className="blacksmith-current-gem">Wybrane gniazdo jest puste.</p>}
          <div className="blacksmith-gem-list">
            {gems.length ? gems.map((stack) => {
              const alreadySocketed = currentGem?.id === stack.gemDefinitionId;
              return (
                <button
                  type="button"
                  key={stack.gemDefinitionId}
                  disabled={alreadySocketed}
                  className={`${selectedGemId === stack.gemDefinitionId ? 'active' : ''} ${alreadySocketed ? 'socketed' : ''}`}
                  onClick={() => onSelectGem(stack.gemDefinitionId)}
                >
                  <GemIcon gem={stack.gemDefinition} />
                  <span>
                    <strong>{stack.gemDefinition.name}</strong>
                    <small>{familyLabels[stack.gemDefinition.family]} · {tierLabels[stack.gemDefinition.tier]} · ×{stack.quantity}</small>
                    {alreadySocketed ? <small className="blacksmith-gem-socketed">Już osadzony w tym gnieździe</small> : null}
                  </span>
                </button>
              );
            }) : <p className="text-sm leading-6 text-stone-500">Nie masz jeszcze klejnotów. Można je zdobyć podczas wypraw.</p>}
          </div>
          {selectedGem ? <p className="blacksmith-gem-description">{gemEffectDescription(selectedGem, item)}</p> : null}
          {sameGemSelected ? <p className="blacksmith-same-gem-notice">Ten klejnot jest już osadzony w wybranym gnieździe.</p> : null}
          <Button fullWidth disabled={busy || !selectedGem || sameGemSelected} onClick={onInsert}>{currentGem ? 'Zastąp klejnot' : 'Opraw klejnot'}</Button>
        </>
      ) : <div className="blacksmith-action-empty"><p>Ten przedmiot nie ma dostępnych gniazd.</p></div>}
    </div>
  );
}

function SocketGemEffect({ family, tier }: { family: GemDefinition['family']; tier: GemDefinition['tier'] }) {
  return (
    <span className={`socket-gem-effect gem-${family.toLowerCase()} gem-tier-${tier.toLowerCase()}`} aria-hidden="true">
      <i />
      <b>{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--socket-ray': index } as CSSProperties} />)}</b>
    </span>
  );
}

const gemAttributeValues: Record<GemDefinition['tier'], number> = {
  SHARD: 1,
  CUT: 2,
  FLAWLESS: 3,
  ROYAL: 4,
  ANCIENT: 6,
};

const gemHpValues: Record<GemDefinition['tier'], number> = {
  SHARD: 4,
  CUT: 8,
  FLAWLESS: 12,
  ROYAL: 18,
  ANCIENT: 26,
};

type PreviewStatKey = 'strengthBonus' | 'agilityBonus' | 'enduranceBonus' | 'intelligenceBonus' | 'attackPower' | 'damageMin' | 'damageMax' | 'defensePower' | 'parryBonus' | 'maxHpBonus' | 'criticalChanceBonus';

function gemStatBonuses(gem: GemDefinition, item: Item): Partial<Record<PreviewStatKey, number>> {
  const value = gemAttributeValues[gem.tier];
  const weapon = item.slotGroup === 'WEAPON';
  const shield = item.slotGroup === 'SHIELD_SIGIL';
  switch (gem.family) {
    case 'RUBY': return weapon
      ? { attackPower: value, damageMin: value, damageMax: value }
      : { maxHpBonus: gemHpValues[gem.tier] };
    case 'AMETHYST': return weapon ? { strengthBonus: value } : { enduranceBonus: value };
    case 'EMERALD': return shield ? { parryBonus: value } : { agilityBonus: value };
    case 'SAPPHIRE': return shield ? { defensePower: value } : { intelligenceBonus: value };
  }
}

function GemStatsPreview({ item, gem, position }: { item: BlacksmithItem; gem: GemDefinition; position: number }) {
  const current = item.item;
  const next: Item = { ...current };
  const replacedGem = item.sockets.find((socket) => socket.position === position)?.gemDefinition;

  const apply = (bonuses: Partial<Record<PreviewStatKey, number>>, direction: 1 | -1) => {
    (Object.entries(bonuses) as Array<[PreviewStatKey, number]>).forEach(([key, value]) => {
      next[key] += value * direction;
    });
  };
  if (replacedGem) apply(gemStatBonuses(replacedGem, current), -1);
  apply(gemStatBonuses(gem, current), 1);

  return <ItemStatsTransition current={current} next={next} label={`Statystyki po oprawieniu: ${gem.name}`} />;
}

function ItemStatsTransition({ current, next, label }: { current: Item; next: Item; label: string }) {
  const rows: Array<{ label: string; current: string; next?: string }> = [];
  const numeric = (rowLabel: string, currentValue: number, nextValue: number, suffix = '', signed = false) => {
    if (currentValue === 0 && nextValue === 0) return;
    const format = (value: number) => `${signed && value > 0 ? '+' : ''}${value}${suffix}`;
    rows.push({ label: rowLabel, current: format(currentValue), next: nextValue !== currentValue ? format(nextValue) : undefined });
  };

  if (current.damageMax > 0 || next.damageMax > 0) rows.push({
    label: 'Obrażenia',
    current: `${current.damageMin}–${current.damageMax}`,
    next: next.damageMin !== current.damageMin || next.damageMax !== current.damageMax ? `${next.damageMin}–${next.damageMax}` : undefined,
  });
  numeric('Atak', current.attackPower, next.attackPower);
  numeric('Obrona', current.defensePower, next.defensePower);
  numeric('Siła', current.strengthBonus, next.strengthBonus, '', true);
  numeric('Zręczność', current.agilityBonus, next.agilityBonus, '', true);
  numeric('Wytrzymałość', current.enduranceBonus, next.enduranceBonus, '', true);
  numeric('Inteligencja', current.intelligenceBonus, next.intelligenceBonus, '', true);
  numeric('Punkty życia', current.maxHpBonus, next.maxHpBonus, ' HP', true);
  const currentParry = itemParryPercent(current.parryBonus);
  const nextParry = itemParryPercent(next.parryBonus);
  if (currentParry !== 0 || nextParry !== 0) rows.push({ label: 'Parowanie', current: formatSignedPercent(currentParry), next: nextParry !== currentParry ? formatSignedPercent(nextParry) : undefined });
  const currentCrit = itemCritPercent(current.criticalChanceBonus);
  const nextCrit = itemCritPercent(next.criticalChanceBonus);
  if (currentCrit !== 0 || nextCrit !== 0) rows.push({ label: 'Trafienie krytyczne', current: formatSignedPercent(currentCrit), next: nextCrit !== currentCrit ? formatSignedPercent(nextCrit) : undefined });

  return (
    <dl className="blacksmith-upgrade-preview blacksmith-gem-stats-preview" aria-label={label}>
      {rows.map((row) => (
        <div key={row.label} className={row.next ? 'will-change' : ''}>
          <dt>{row.label}</dt>
          <dd className="game-number"><span>{row.current}</span>{row.next ? <><i aria-hidden="true">→</i><strong>{row.next}</strong></> : null}</dd>
        </div>
      ))}
    </dl>
  );
}

function gemEffectDescription(gem: GemDefinition, item: BlacksmithItem): string {
  const weapon = item.item.slotGroup === 'WEAPON';
  const shield = item.item.slotGroup === 'SHIELD_SIGIL';
  switch (gem.family) {
    case 'RUBY': return weapon ? 'W broni zwiększa atak oraz minimalne i maksymalne obrażenia.' : 'W pancerzu zwiększa maksymalne zdrowie.';
    case 'AMETHYST': return weapon ? 'W broni zwiększa STR.' : 'W pancerzu zwiększa CON.';
    case 'EMERALD': return shield ? 'W tarczy lub sigilu zwiększa parowanie.' : 'Zwiększa DEX.';
    case 'SAPPHIRE': return shield ? 'W tarczy lub sigilu zwiększa obronę.' : 'Zwiększa INT.';
  }
}
