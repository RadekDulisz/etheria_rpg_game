import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseItem } from '../../api/shop.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { ShopOffer } from '../../types/game';
import { ShopItemCard } from './ShopItemCard';

interface ShopViewProps {
  offers: ShopOffer[];
  characterGold: string;
}

export function ShopView({ offers, characterGold }: ShopViewProps) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Targowisko" title="Dzisiejsze okazje" description="Codziennie pojawia się osiem nowych ofert z losowymi rabatami. Przy odrobinie szczęścia trafisz tu również na rzadkie przedmioty." />
      {successMessage ? <ActionNotice tone="success" onDismiss={() => setSuccessMessage(null)}>{successMessage}</ActionNotice> : null}
      {purchaseMutation.isError ? <ActionNotice tone="error" onDismiss={() => purchaseMutation.reset()}>{getApiErrorMessage(purchaseMutation.error)}</ActionNotice> : null}

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
                onPurchase={(quantity) => purchaseMutation.mutate({ offerId: offer.id, quantity })}
              />
            );
          })}
        </div>
      ) : <EmptyState title="Kupiec jeszcze nie przybył">Dzisiejsza oferta nie jest jeszcze gotowa.</EmptyState>}
    </div>
  );
}
