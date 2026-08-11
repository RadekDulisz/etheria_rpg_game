import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionToast } from '../../components/ui/ActionToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { GamePanel } from '../../components/ui/GamePanel';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { equipItem, sellItem, unequipItem } from '../../api/inventory.api';
import type {
  CharacterStats,
  EquipmentSlot,
  EquippedEntry,
  GemStack,
  InventoryEntry,
} from '../../types/game';
import { BackpackDetails } from './BackpackDetails';
import { BackpackGrid } from './BackpackGrid';
import { BackpackToolbar } from './BackpackToolbar';
import { EquipmentGrid } from './EquipmentGrid';
import { getCompatibleSlots } from './equipment-slots';
import type {
  BackpackCategory,
  BackpackIconSize,
  BackpackSelection,
  BackpackSort,
} from './backpack.types';

interface InventoryViewProps {
  inventory: InventoryEntry[];
  gems: GemStack[];
  equipment: EquippedEntry[];
  characterStats: CharacterStats | null;
  onOpenBlacksmith: () => void;
}

const RARITY_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 } as const;

export function InventoryView({ inventory, gems, equipment, characterStats, onOpenBlacksmith }: InventoryViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BackpackCategory>('ALL');
  const [grade, setGrade] = useState('ALL');
  const [sort, setSort] = useState<BackpackSort>('NEWEST');
  const [iconSize, setIconSize] = useState<BackpackIconSize>('LARGE');
  const [selection, setSelection] = useState<BackpackSelection | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, EquipmentSlot>>({});
  const [saleToConfirm, setSaleToConfirm] = useState<InventoryEntry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLocaleLowerCase('pl');
  const filteredItems = useMemo(() => inventory
    .filter((entry) => (!normalizedSearch || entry.item.name.toLocaleLowerCase('pl').includes(normalizedSearch)))
    .filter((entry) => grade === 'ALL' || entry.item.grade === grade)
    .filter((entry) => category === 'ALL' || itemCategory(entry) === category)
    .sort(itemComparator(sort)), [category, grade, inventory, normalizedSearch, sort]);

  const filteredGems = useMemo(() => gems
    .filter(() => category === 'ALL' || category === 'GEM')
    .filter(() => grade === 'ALL')
    .filter((stack) => !normalizedSearch || stack.gemDefinition.name.toLocaleLowerCase('pl').includes(normalizedSearch))
    .sort((left, right) => sort === 'NAME'
      ? left.gemDefinition.name.localeCompare(right.gemDefinition.name, 'pl')
      : right.gemDefinition.minLevel - left.gemDefinition.minLevel), [category, gems, grade, normalizedSearch, sort]);

  async function refreshInventoryState() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['blacksmith'] }),
      queryClient.invalidateQueries({ queryKey: ['arena', 'opponent'] }),
    ]);
  }

  const equipMutation = useMutation({
    mutationFn: ({ entry, slot }: { entry: InventoryEntry; slot: EquipmentSlot }) => equipItem(entry.id, slot),
    onSuccess: async (_, variables) => {
      setSuccessMessage(`Założono: ${variables.entry.item.name}.`);
      setSelection(null);
      await refreshInventoryState();
    },
  });
  const unequipMutation = useMutation({
    mutationFn: (entry: EquippedEntry) => unequipItem(entry.slot as EquipmentSlot),
    onSuccess: async (_, entry) => {
      setSuccessMessage(`Zdjęto: ${entry.item.name}.`);
      setSelection(null);
      await refreshInventoryState();
    },
  });
  const sellMutation = useMutation({
    mutationFn: (entry: InventoryEntry) => sellItem(entry.id),
    onSuccess: async (sale, entry) => {
      setSaleToConfirm(null);
      setSelection(null);
      setSuccessMessage(`Sprzedano ${entry.item.name} za ${sale.proceeds} monet.`);
      await refreshInventoryState();
    },
  });

  const selectedInventory = selection?.kind === 'ITEM' ? selection.entry : null;
  const compatibleSlots = selectedInventory ? getCompatibleSlots(selectedInventory.item.slotGroup) : [];
  const firstFreeSlot = compatibleSlots.find((slot) => !equipment.some((entry) => entry.slot === slot));
  const selectedSlot = selectedInventory
    ? selectedSlots[selectedInventory.id] ?? firstFreeSlot ?? compatibleSlots[0]
    : undefined;
  const mutationError = equipMutation.error ?? unequipMutation.error ?? sellMutation.error;
  const busy = equipMutation.isPending || unequipMutation.isPending || sellMutation.isPending;

  return (
    <div className="view-enter inventory-workspace">
      <SectionTitle eyebrow="Zbrojownia" title="Plecak i wyposażenie" description="Przeszukuj zgromadzone łupy, porównuj je z wyposażeniem i przygotuj bohatera do następnej drogi." />
      {successMessage ? <ActionToast onDismiss={() => setSuccessMessage(null)}>{successMessage}</ActionToast> : null}

      <section className="backpack-shell">
        <header className="backpack-shell-heading">
          <div><span>MAGAZYN BOHATERA</span><h2>Plecak</h2></div>
          <p><strong>{inventory.length}</strong> przedmiotów <i /> <strong>{gems.reduce((sum, stack) => sum + stack.quantity, 0)}</strong> klejnotów</p>
        </header>

        <BackpackToolbar
          search={search} category={category} grade={grade} sort={sort} iconSize={iconSize}
          resultCount={filteredItems.length + filteredGems.length}
          onSearch={setSearch} onCategory={setCategory} onGrade={setGrade} onSort={setSort} onIconSize={setIconSize}
        />

        <div className="backpack-layout">
          <div className="backpack-inventory-pane">
            <BackpackGrid items={filteredItems} gems={filteredGems} iconSize={iconSize} selected={selection} onSelect={setSelection} />
          </div>

          <aside className={`backpack-side-pane ${selection ? 'has-selection' : ''}`}>
            <section className="backpack-equipment">
              <header><span>18 MIEJSC</span><h3>Wyposażenie</h3></header>
              <EquipmentGrid equipment={equipment} selected={selection} onSelect={setSelection} />
            </section>
            <BackpackDetails
              selection={selection} equipment={equipment} characterStats={characterStats} selectedSlot={selectedSlot}
              busy={busy} error={mutationError}
              onSlot={(slot) => selectedInventory && setSelectedSlots((current) => ({ ...current, [selectedInventory.id]: slot }))}
              onEquip={() => selectedInventory && selectedSlot && equipMutation.mutate({ entry: selectedInventory, slot: selectedSlot })}
              onUnequip={() => selection?.kind === 'EQUIPPED' && unequipMutation.mutate(selection.entry)}
              onSell={() => selectedInventory && setSaleToConfirm(selectedInventory)}
              onDismissError={() => { equipMutation.reset(); unequipMutation.reset(); sellMutation.reset(); }}
              onOpenBlacksmith={onOpenBlacksmith}
              onClose={() => setSelection(null)}
            />
            {saleToConfirm ? (
              <div className="backpack-sale-confirm">
                <ConfirmDialog
                  title="Sprzedać przedmiot?" pending={sellMutation.isPending}
                  onCancel={() => setSaleToConfirm(null)} onConfirm={() => sellMutation.mutate(saleToConfirm)}
                  confirmLabel={<span className="inline-flex items-center gap-2">Sprzedaj za <CurrencyAmount value={Math.max(1, Math.floor(saleToConfirm.item.price * .3))} compact /></span>}
                >
                  Przedmiot <strong>{saleToConfirm.item.name}</strong> zostanie sprzedany bez możliwości cofnięcia operacji.
                </ConfirmDialog>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}

function itemCategory(entry: InventoryEntry): BackpackCategory {
  if (entry.item.category === 'WEAPON') return 'WEAPON';
  if (entry.item.category === 'ARMOR' || entry.item.category === 'SHIELD_SIGIL') return 'ARMOR';
  if (['NECKLACE', 'EARRING', 'RING', 'BRACELET'].includes(entry.item.slotGroup ?? '')) return 'JEWELRY';
  return 'SPECIAL';
}

function itemComparator(sort: BackpackSort) {
  return (left: InventoryEntry, right: InventoryEntry): number => {
    switch (sort) {
      case 'NAME': return left.item.name.localeCompare(right.item.name, 'pl');
      case 'LEVEL': return right.item.minLevel - left.item.minLevel;
      case 'RARITY': return RARITY_ORDER[right.item.rarity] - RARITY_ORDER[left.item.rarity];
      case 'VALUE': return right.item.price - left.item.price;
      case 'ENHANCEMENT': return right.enhancementLevel - left.enhancementLevel;
      default: return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }
  };
}
