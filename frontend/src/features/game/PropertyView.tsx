import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buyProperty, getMyProperty, restoreAtProperty, upgradeProperty } from '../../api/properties.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GamePanel } from '../../components/ui/GamePanel';
import { HealthBar } from '../../components/ui/HealthBar';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { Character, PlayerProperty } from '../../types/game';

const PROPERTY_LEVELS = [
  [1, 1, 'Opuszczone domostwo i palenisko'], [2, 5, 'Odbudowany dach'],
  [3, 10, 'Studnia i ogród zielarski'], [4, 15, 'Kapliczka lub miejsce rytuału'],
  [5, 20, 'Palisada i brama'], [6, 30, 'Warsztat i stajnia'],
  [7, 40, 'Wieża strażnicza'], [8, 52, 'Kamienny dwór'],
  [9, 61, 'Wielka kaplica i biblioteka'], [10, 76, 'Ufortyfikowana rezydencja'],
] as const;

export function PropertyView({ character }: { character: Character }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);
  const propertyQuery = useQuery({ queryKey: ['property', 'mine'], queryFn: getMyProperty, retry: false, refetchInterval: 30_000 });
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['property', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['missions'] }),
    ]);
  }
  const buyMutation = useMutation({ mutationFn: buyProperty, onSuccess: async (property) => { setSuccess(`Objęto posiadłość ${property.name}.`); await refresh(); } });
  const upgradeMutation = useMutation({ mutationFn: upgradeProperty, onSuccess: async (property) => { setConfirmUpgrade(false); setSuccess(`Posiadłość osiągnęła poziom ${property.level}.`); await refresh(); } });
  const restoreMutation = useMutation({ mutationFn: restoreAtProperty, onSuccess: async (property) => { setSuccess(`Bohater odzyskał zdrowie. Pozostało ${property.health.current} / ${property.health.max} HP.`); await refresh(); } });
  const error = buyMutation.error ?? upgradeMutation.error ?? restoreMutation.error;
  const pending = buyMutation.isPending || upgradeMutation.isPending || restoreMutation.isPending;
  const property = propertyQuery.data;

  return <div className="view-enter">
    <SectionTitle eyebrow="Posiadłość" title={property?.name ?? 'Własne ziemie'} description={property ? 'Rozwijaj siedzibę, przyspieszaj regenerację i korzystaj z mocy związanej z reputacją bohatera.' : 'Obejmij opuszczone domostwo i wznoś kolejne części swojej siedziby.'} />
    {success ? <ActionNotice tone="success" onDismiss={() => setSuccess(null)}>{success}</ActionNotice> : null}
    {error ? <ActionNotice tone="error" onDismiss={() => { buyMutation.reset(); upgradeMutation.reset(); restoreMutation.reset(); }}>{getApiErrorMessage(error)}</ActionNotice> : null}
    {propertyQuery.isLoading ? <GamePanel><EmptyState title="Kartograf bada ziemie">Trwa odczytywanie księgi własności.</EmptyState></GamePanel> : property ? <PropertyEstate character={character} property={property} pending={pending} onRestore={() => restoreMutation.mutate()} onUpgrade={() => setConfirmUpgrade(true)} /> : <PropertyPurchase pending={pending} characterGold={character.gold} onBuy={(input) => buyMutation.mutate(input)} />}
    {confirmUpgrade && property ? <div className="property-decision"><ConfirmDialog title={`Rozbudować posiadłość do poziomu ${property.level + 1}?`} pending={upgradeMutation.isPending} onCancel={() => setConfirmUpgrade(false)} onConfirm={() => upgradeMutation.mutate()} confirmLabel={upgradeMutation.isPending ? 'Trwa rozbudowa…' : <span className="inline-flex items-center gap-2">Rozbuduj za <CurrencyAmount value={property.nextUpgradeCost} compact /></span>}><p>Nowy element: <strong className="text-stone-200">{property.nextElement}</strong>.</p><p className="mt-2">Wymagany poziom bohatera: {property.nextLevelRequiredCharacterLevel}.</p></ConfirmDialog></div> : null}
  </div>;
}

function PropertyPurchase({ pending, characterGold, onBuy }: { pending: boolean; characterGold: string; onBuy: (input: { name: string; description?: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  function submit(event: FormEvent) { event.preventDefault(); onBuy({ name: name.trim(), description: description.trim() || undefined }); }
  return <>
    <section className="property-wilderness"><img src="/assets/property/property-level-1.png" alt="Opuszczona posiadłość na rubieżach Etherii" /><article><span>Ziemia bez chorągwi</span><h2>Wśród ruin wciąż tli się ogień dawnego domostwa.</h2><p>Przejmij ziemię za 150 monet. Każdy poziom rozbudowy przyspieszy regenerację zdrowia i odsłoni nowe możliwości.</p></article></section>
    <GamePanel className="mt-4" title="Akt własności" eyebrow="Pierwszy poziom posiadłości">
      <form className="property-purchase-form" onSubmit={submit}>
        <label><span>Nazwa posiadłości</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={40} required placeholder="np. Wilcze Uroczysko" /></label>
        <label><span>Opis ziem</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} rows={3} placeholder="Krótki opis posiadłości…" /></label>
        <div><p>Stan sakwy: <CurrencyAmount value={characterGold} compact /></p><Button type="submit" disabled={pending || name.trim().length < 3 || BigInt(characterGold) < 150n}>Obejmij ziemię · 150</Button></div>
      </form>
    </GamePanel>
  </>;
}

function PropertyEstate({ character, property, pending, onRestore, onUpgrade }: { character: Character; property: PlayerProperty; pending: boolean; onRestore: () => void; onUpgrade: () => void }) {
  const [seconds, setSeconds] = useState(property.restoration.secondsRemaining);
  useEffect(() => {
    const syncTimer = window.setTimeout(() => setSeconds(property.restoration.secondsRemaining), 0);
    if (property.restoration.secondsRemaining <= 0) return () => window.clearTimeout(syncTimer);
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => { window.clearTimeout(syncTimer); window.clearInterval(timer); };
  }, [property.restoration.secondsRemaining]);
  const canUpgrade = property.level < property.maxLevel && character.level >= (property.nextLevelRequiredCharacterLevel ?? Infinity) && BigInt(character.gold) >= BigInt(property.nextUpgradeCost);
  return <>
    <section className={`property-estate property-estate-level-${property.level} property-estate-${property.reputationBonus.alignment.toLowerCase()}`}>
      <img src={`/assets/property/property-level-${property.level}.png`} alt={`Posiadłość ${property.name} na poziomie ${property.level}`} />
      <article><div className="property-estate-copy"><span>{property.currentElement}</span><h2>{property.name}</h2><p>{property.description ?? 'Siedziba bohatera na rubieżach Etherii.'}</p><small>Poziom {property.level} z {property.maxLevel}</small></div><div className="property-level-track" aria-label={`Poziom posiadłości: ${property.level} z ${property.maxLevel}`}>{PROPERTY_LEVELS.map(([level]) => <i key={level} className={level <= property.level ? 'is-built' : ''}><span>{level}</span></i>)}</div></article>
    </section>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.86fr]">
      <GamePanel title="Odpoczynek bohatera" eyebrow="Regeneracja zdrowia">
        <HealthBar value={property.health.current} max={property.health.max} />
        <div className="property-restoration-grid"><article><span>Naturalna regeneracja</span><strong>{property.regeneration.percentPerFiveMinutes}% HP</strong><small>co pięć minut · ×{property.regeneration.multiplier}</small></article><article><span>Jednorazowe odnowienie</span><strong>+{property.restoration.healPercent}% HP</strong><small>ponownie co 30 minut</small></article></div>
        <Button className="mt-4" fullWidth disabled={pending || seconds > 0 || property.health.current >= property.health.max || BigInt(character.gold) < BigInt(property.restoration.goldCost)} onClick={onRestore}>{seconds > 0 ? `Miejsce odnowy: ${formatCooldown(seconds)}` : <span className="inline-flex items-center gap-2">{property.restoration.actionName} · <CurrencyAmount value={property.restoration.goldCost} compact /></span>}</Button>
        {property.health.current >= property.health.max ? <p className="mt-2 text-center text-[0.62rem] text-stone-500">Bohater ma pełne zdrowie.</p> : null}
      </GamePanel>
      <GamePanel title={property.reputationBonus.title} eyebrow="Wpływ reputacji">
        <div className={`property-reputation property-reputation-${property.reputationBonus.alignment.toLowerCase()}`}><span>{property.reputationBonus.alignment === 'GOOD' ? 'Dobra ścieżka' : property.reputationBonus.alignment === 'EVIL' ? 'Mroczna ścieżka' : 'Neutralna ścieżka'}</span><p>{property.reputationBonus.alignment === 'GOOD' ? 'Mieszkańcy i opiekunowie ziem zwiększają szansę powodzenia wypraw.' : property.reputationBonus.alignment === 'EVIL' ? 'Haracz oraz szpiedzy zwiększają łupy i szansę odnalezienia przedmiotu.' : 'Posiadłość zapewnia bezpieczne schronienie bez dodatkowego wpływu moralnego.'}</p></div>
        <dl className="property-bonus-list"><div><dt>Powodzenie wypraw</dt><dd>+{property.reputationBonus.missionSuccessPercent}%</dd></div><div><dt>Złoto z wypraw</dt><dd>+{property.reputationBonus.missionGoldPercent}%</dd></div><div><dt>Szansa na przedmiot</dt><dd>+{property.reputationBonus.itemChancePercent}%</dd></div></dl>
      </GamePanel>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[.74fr_1.26fr]">
      <GamePanel title={property.level >= property.maxLevel ? 'Posiadłość ukończona' : `Następny poziom: ${property.level + 1}`} eyebrow="Rozbudowa">
        {property.level < property.maxLevel ? <div className="property-next-level"><span>Nowy element</span><h3>{property.nextElement}</h3><dl><div><dt>Wymagany poziom</dt><dd>{property.nextLevelRequiredCharacterLevel}</dd></div><div><dt>Koszt budowy</dt><dd><CurrencyAmount value={property.nextUpgradeCost} compact /></dd></div></dl><Button fullWidth disabled={pending || !canUpgrade} onClick={onUpgrade}>Rozbuduj posiadłość</Button>{!canUpgrade ? <small>{character.level < (property.nextLevelRequiredCharacterLevel ?? 0) ? `Bohater potrzebuje poziomu ${property.nextLevelRequiredCharacterLevel}.` : 'W sakwie brakuje złota.'}</small> : null}</div> : <p className="text-sm leading-6 text-stone-400">Wszystkie części rezydencji zostały ukończone. Dalszy rozwój pojawi się wraz z nowymi ziemiami Etherii.</p>}
      </GamePanel>
      <GamePanel title="Plan rozbudowy" eyebrow="Dziesięć etapów">
        <div className="property-level-list">{PROPERTY_LEVELS.map(([level, required, element]) => <article key={level} className={level <= property.level ? 'is-built' : level === property.level + 1 ? 'is-next' : ''}><span>{level}</span><div><strong>{element}</strong><small>Wymagany poziom bohatera: {required}</small></div><i>{level <= property.level ? 'Wzniesiono' : level === property.level + 1 ? 'Następny' : 'Zamknięty'}</i></article>)}</div>
      </GamePanel>
    </div>
  </>;
}

function formatCooldown(seconds: number) { const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
