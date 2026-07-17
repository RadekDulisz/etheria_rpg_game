import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { equipItem, sellItem, unequipItem } from '../../api/inventory.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GamePanel } from '../../components/ui/GamePanel';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import { formatItemType } from '../../lib/formatters';
import type { EquipmentSlot, EquippedEntry, InventoryEntry } from '../../types/game';
import { getCompatibleSlots, getEquipmentSlotLabel } from './equipment-slots';

interface InventoryViewProps {
  inventory: InventoryEntry[];
  equipment: EquippedEntry[];
}

export function InventoryView({ inventory, equipment }: InventoryViewProps) {
  const queryClient = useQueryClient();
  const [selectedSlots, setSelectedSlots] = useState<Record<string, EquipmentSlot>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saleToConfirm, setSaleToConfirm] = useState<InventoryEntry | null>(null);

  async function refreshEquipmentState() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
    ]);
  }

  const equipMutation = useMutation({
    mutationFn: ({ itemId, slot }: { itemId: string; slot: EquipmentSlot; itemName: string }) => equipItem(itemId, slot),
    onSuccess: async (_, variables) => {
      setSuccessMessage(`Założono: ${variables.itemName}.`);
      await refreshEquipmentState();
    },
  });

  const unequipMutation = useMutation({
    mutationFn: ({ slot }: { slot: EquipmentSlot; itemName: string }) => unequipItem(slot),
    onSuccess: async (_, variables) => {
      setSuccessMessage(`Zdjęto: ${variables.itemName}.`);
      await refreshEquipmentState();
    },
  });

  const sellMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string; itemName: string }) => sellItem(itemId),
    onSuccess: async (sale, variables) => {
      setSaleToConfirm(null);
      setSuccessMessage(`Sprzedano ${variables.itemName} za ${sale.proceeds} monet.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      ]);
    },
  });

  const mutationError = equipMutation.error ?? unequipMutation.error ?? sellMutation.error;

  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Zbrojownia" title="Plecak i wyposażenie" description="Zakładaj przedmioty w odpowiednich miejscach. Zastąpiony przedmiot automatycznie wróci do plecaka." />
      {successMessage ? <ActionNotice tone="success" onDismiss={() => setSuccessMessage(null)}>{successMessage}</ActionNotice> : null}
      {mutationError ? <ActionNotice tone="error" onDismiss={() => { equipMutation.reset(); unequipMutation.reset(); sellMutation.reset(); }}>{getApiErrorMessage(mutationError)}</ActionNotice> : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GamePanel title="Plecak" eyebrow={`${inventory.length} rodzajów przedmiotów`}>
          {inventory.length ? (
            <div className="inventory-grid">
              {inventory.map((entry) => {
                const rarity = entry.item.rarity.toLowerCase();
                const compatibleSlots = getCompatibleSlots(entry.item.slotGroup);
                const firstFreeSlot = compatibleSlots.find((slot) => !equipment.some((equipped) => equipped.slot === slot));
                const selectedSlot = selectedSlots[entry.itemId] ?? firstFreeSlot ?? compatibleSlots[0];
                const requiresSlotChoice = compatibleSlots.length > 1;
                const isAlreadyEquippedInSlot = equipment.some((equipped) => equipped.slot === selectedSlot && equipped.itemId === entry.itemId);
                const isEquipping = equipMutation.isPending && equipMutation.variables?.itemId === entry.itemId;
                const isSelling = sellMutation.isPending && sellMutation.variables?.itemId === entry.itemId;

                return (
                  <article key={entry.id} className={`inventory-card inventory-card-actionable inventory-card-rarity-${rarity} ${saleToConfirm?.id === entry.id ? 'inventory-card-sale-open' : ''}`}>
                    <div className={`item-mark rarity-gem rarity-gem-${rarity}`} aria-hidden="true"><ItemIcon item={entry.item} /></div>
                    <div className="inventory-item-content">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-start gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm text-stone-200" title={entry.item.name}>{entry.item.name}</p>
                          <span className="game-number shrink-0 text-xs text-amber-200">×{entry.quantity}</span>
                        </div>
                        <p className="mt-1 text-[0.62rem] text-stone-500">{formatItemType(entry.item)}</p>
                        <p className="mt-2 text-[0.58rem] uppercase tracking-[0.14em] text-amber-500/55">Poziom {entry.item.minLevel}</p>
                      </div>
                      <div className="inventory-item-properties">
                        <GradeBadge grade={entry.item.grade} />
                        <ItemStats item={entry.item} compact />
                      </div>
                    </div>

                    <div className="col-span-2 mt-1 flex flex-wrap items-stretch justify-end gap-2 border-t border-amber-800/20 pt-2">
                      {compatibleSlots.length && requiresSlotChoice ? (
                        <label className="min-w-[8rem] flex-1">
                          <span className="sr-only">Wybierz miejsce dla przedmiotu: {entry.item.name}</span>
                          <select
                            className="h-full w-full border border-amber-800/30 bg-slate-950/70 px-2 text-xs text-stone-300 outline-none focus:border-amber-500/60"
                            value={selectedSlot}
                            onChange={(event) => setSelectedSlots((current) => ({ ...current, [entry.itemId]: event.target.value as EquipmentSlot }))}
                          >
                            {compatibleSlots.map((slot) => <option key={slot} value={slot}>{getEquipmentSlotLabel(slot)}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {compatibleSlots.length ? (
                        <Button disabled={equipMutation.isPending || unequipMutation.isPending || sellMutation.isPending || isAlreadyEquippedInSlot} onClick={() => equipMutation.mutate({ itemId: entry.itemId, slot: selectedSlot, itemName: entry.item.name })}>
                          {isEquipping ? 'Zakładanie…' : isAlreadyEquippedInSlot ? 'Założone' : 'Załóż'}
                        </Button>
                      ) : null}
                      <div className="sale-confirm-anchor">
                        <Button variant="secondary" disabled={equipMutation.isPending || unequipMutation.isPending || sellMutation.isPending} onClick={() => setSaleToConfirm(entry)} title={`Sprzedaj jedną sztukę za ${Math.max(1, Math.floor(entry.item.price * 0.3))} monet`}>
                          {isSelling ? 'Sprzedaż…' : <span className="inline-flex items-center gap-2">Sprzedaj <CurrencyAmount value={Math.max(1, Math.floor(entry.item.price * 0.3))} compact /></span>}
                        </Button>
                        {saleToConfirm?.id === entry.id ? (
                          <ConfirmDialog
                            className="sale-confirm-popover"
                            title="Sprzedać przedmiot?"
                            pending={sellMutation.isPending}
                            onCancel={() => setSaleToConfirm(null)}
                            onConfirm={() => sellMutation.mutate({ itemId: saleToConfirm.itemId, itemName: saleToConfirm.item.name })}
                            confirmLabel={sellMutation.isPending ? 'Sprzedawanie…' : <span className="inline-flex items-center gap-2">Sprzedaj za <CurrencyAmount value={Math.max(1, Math.floor(saleToConfirm.item.price * 0.3))} compact /></span>}
                          >
                            Czy na pewno chcesz sprzedać jedną sztukę przedmiotu <strong className="text-stone-200">{saleToConfirm.item.name}</strong>? Tej operacji nie można cofnąć.
                          </ConfirmDialog>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState title="Pusty plecak">Pierwsze przedmioty możesz kupić na targowisku lub zdobyć podczas wypraw.</EmptyState>}
        </GamePanel>

        <GamePanel title="Założone przedmioty" eyebrow={`${equipment.length} z 18 miejsc`}>
          {equipment.length ? (
            <div className="divide-y divide-amber-800/20 border border-amber-800/20">
              {equipment.map((entry) => {
                const isUnequipping = unequipMutation.isPending && unequipMutation.variables?.slot === entry.slot;
                const rarity = entry.item.rarity.toLowerCase();
                return (
                  <div key={entry.slot} className={`equipped-list-row equipped-list-row-${rarity}`}>
                    <div className="equipped-list-content">
                      <div className={`equipped-item-mark rarity-gem rarity-gem-${rarity}`} aria-hidden="true"><ItemIcon item={entry.item} /></div>
                      <div className="equipped-list-main">
                        <div className="min-w-0">
                          <p className="truncate text-stone-200" title={entry.item.name}>{entry.item.name}</p>
                          <p className="mt-1 text-[0.62rem] text-stone-500">{formatItemType(entry.item)} · {getEquipmentSlotLabel(entry.slot)}</p>
                        </div>
                        <div className="equipped-list-properties">
                          <GradeBadge grade={entry.item.grade} />
                          <ItemStats item={entry.item} compact />
                        </div>
                      </div>
                    </div>
                    <Button variant="secondary" disabled={equipMutation.isPending || unequipMutation.isPending} onClick={() => unequipMutation.mutate({ slot: entry.slot as EquipmentSlot, itemName: entry.item.name })}>
                      {isUnequipping ? 'Zdejmowanie…' : 'Zdejmij'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState title="Brak wyposażenia">Bohater nie ma jeszcze założonych przedmiotów.</EmptyState>}
        </GamePanel>
      </div>

    </div>
  );
}
