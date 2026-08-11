import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarketRefreshStatus, purchaseItem, refreshMarketOffers } from '../../api/shop.api';
import { ActionBubble } from '../../components/ui/ActionBubble';
import { ActionToast } from '../../components/ui/ActionToast';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { CharacterStats, EquippedEntry, ShopOffer } from '../../types/game';
import { ShopItemCard } from './ShopItemCard';

interface ShopViewProps {
  offers: ShopOffer[];
  characterGold: string;
  equipment: EquippedEntry[];
  characterStats: CharacterStats | null;
}

export function ShopView({ offers, characterGold, equipment, characterStats }: ShopViewProps) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const refreshStatusQuery = useQuery({ queryKey: ['shop', 'refresh-status'], queryFn: getMarketRefreshStatus, retry: false });
  const purchaseMutation = useMutation({
    mutationFn: ({ offerId, quantity }: { offerId: string; quantity: number }) => purchaseItem(offerId, quantity),
    onSuccess: async (_, variables) => {
      const offer = offers.find((entry) => entry.id === variables.offerId);
      setSuccessMessage(`Zakupiono ${offer?.item.name ?? 'przedmiot'} ×${variables.quantity}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      ]);
    },
  });
  const refreshMutation = useMutation({
    mutationFn: refreshMarketOffers,
    onSuccess: async (status) => {
      setConfirmRefresh(false);
      setSuccessMessage(`Kupcy rozłożyli nową ofertę. Pozostałe odświeżenia dzisiaj: ${status.refreshesRemaining}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['shop', 'refresh-status'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
      ]);
    },
    onError: () => setConfirmRefresh(false),
  });

  const refreshStatus = refreshStatusQuery.data;
  const refreshCost = refreshStatus?.nextRefreshCost ?? null;

  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Targowisko" title="Dzisiejsze okazje" description="Codziennie pojawia się osiem nowych ofert z losowymi rabatami. Przy odrobinie szczęścia trafisz tu również na rzadkie przedmioty." />
      {successMessage ? <ActionToast onDismiss={() => setSuccessMessage(null)}>{successMessage}</ActionToast> : null}

      <section className="market-refresh-bar">
        <div>
          <span>Nowe wozy kupieckie</span>
          <strong>Odśwież dzisiejszą ofertę</strong>
          <p>Nowy zestaw zachowuje obecne szanse rzadkości i rabatów. Limit odnawia się o północy.</p>
        </div>
        <dl>
          <div><dt>Wykorzystano</dt><dd className="game-number">{refreshStatus?.refreshesUsed ?? '—'} / 3</dd></div>
          <div><dt>Koszt następnego</dt><dd>{refreshCost !== null ? <CurrencyAmount value={refreshCost} compact /> : 'Limit osiągnięty'}</dd></div>
        </dl>
        <div className="action-feedback-anchor market-refresh-action">
          <Button disabled={!refreshStatus || refreshStatus.refreshesRemaining === 0 || refreshMutation.isPending} onClick={() => setConfirmRefresh(true)}>
            {refreshMutation.isPending ? 'Losowanie…' : refreshStatus?.refreshesRemaining === 0 ? 'Wróć jutro' : 'Odśwież ofertę'}
          </Button>
          {refreshMutation.error ? <ActionBubble onDismiss={() => refreshMutation.reset()}>{getApiErrorMessage(refreshMutation.error)}</ActionBubble> : null}
        </div>
      </section>

      {confirmRefresh && refreshCost !== null ? createPortal(
        <div className="market-refresh-confirm">
          <ConfirmDialog
            title="Sprowadzić nową ofertę?"
            confirmLabel={refreshMutation.isPending ? 'Losowanie oferty…' : <>Zapłać <CurrencyAmount value={refreshCost} compact /></>}
            pending={refreshMutation.isPending}
            onCancel={() => setConfirmRefresh(false)}
            onConfirm={() => refreshMutation.mutate()}
          >Obecne oferty znikną. Kupcy pobiorą opłatę, a nowego zestawu nie będzie można przywrócić.</ConfirmDialog>
        </div>,
        document.body,
      ) : null}

      {offers.length ? (
        <div className="shop-grid">
          {offers.map((offer) => {
            const remainingCount = offer.stockLimit === null ? 99 : Math.max(offer.stockLimit - offer.quantitySold, 0);
            return (
              <ShopItemCard
                key={offer.id}
                item={offer.item}
                price={offer.priceOverride ?? offer.item.price}
                originalPrice={offer.item.price}
                discountPercent={offer.discountPercent ?? undefined}
                characterGold={characterGold}
                locked={offer.locked}
                maxQuantity={remainingCount}
                purchasing={purchaseMutation.isPending && purchaseMutation.variables?.offerId === offer.id}
                equipment={equipment}
                characterStats={characterStats}
                error={purchaseMutation.isError && purchaseMutation.variables?.offerId === offer.id ? getApiErrorMessage(purchaseMutation.error) : undefined}
                onDismissError={() => purchaseMutation.reset()}
                onPurchase={(quantity) => purchaseMutation.mutate({ offerId: offer.id, quantity })}
              />
            );
          })}
        </div>
      ) : <EmptyState title="Kupiec jeszcze nie przybył">Dzisiejsza oferta nie jest jeszcze gotowa.</EmptyState>}
    </div>
  );
}
