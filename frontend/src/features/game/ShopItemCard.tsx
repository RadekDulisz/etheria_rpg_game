import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ActionBubble } from '../../components/ui/ActionBubble';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { ItemComparison } from '../../components/ui/ItemComparison';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { RarityBadge } from '../../components/ui/RarityBadge';
import { GameIcon } from '../../components/ui/GameIcon';
import { itemCategoryIcon } from '../../lib/game-icons';
import { formatItemCategory } from '../../lib/formatters';
import type { CharacterStats, EquippedEntry, Item } from '../../types/game';

interface ShopItemCardProps {
  item: Item;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  characterGold: string;
  locked: boolean;
  maxQuantity?: number;
  purchasing: boolean;
  onPurchase: (quantity: number) => void;
  equipment: EquippedEntry[];
  characterStats: CharacterStats | null;
  error?: string;
  onDismissError?: () => void;
}

export function ShopItemCard({ item, price, originalPrice, discountPercent, characterGold, locked, maxQuantity = 99, purchasing, onPurchase, equipment, characterStats, error, onDismissError }: ShopItemCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [localWarning, setLocalWarning] = useState<string | null>(null);
  const safeMax = Math.max(maxQuantity, 1);
  const selectedQuantity = Math.min(quantity, safeMax);
  const canAfford = BigInt(characterGold) >= BigInt(price * selectedQuantity);
  const available = maxQuantity > 0;

  function attemptPurchase() {
    if (!available) setLocalWarning('Oferta została już wyprzedana.');
    else if (!canAfford) setLocalWarning('W sakwie brakuje złota na ten zakup.');
    else {
      setLocalWarning(null);
      onPurchase(selectedQuantity);
    }
  }

  return (
    <article className={`shop-card shop-card-${item.rarity.toLowerCase()}`}>
      <div className="shop-item-visual" aria-hidden="true">
        {discountPercent ? <strong className="discount-badge">−{discountPercent}%</strong> : null}
        <span><ItemIcon item={item} /></span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg leading-tight text-amber-100 fantasy-title">{item.name}</p>
          <RarityBadge rarity={item.rarity} />
        </div>
        <p className="shop-category-label"><GameIcon name={itemCategoryIcon(item)} />{formatItemCategory(item.category)}</p>
        <div className="mt-2"><GradeBadge grade={item.grade} /></div>
        {discountPercent ? <p className="mt-2 text-[0.58rem] uppercase tracking-[0.14em] text-emerald-300/75">Oferta dnia · oszczędzasz {discountPercent}%</p> : null}
        {item.description ? <p className="mt-3 text-xs leading-5 text-stone-500">{item.description}</p> : null}

        <ItemStats item={item} />
        <ItemComparison item={item} equipment={equipment} characterStats={characterStats} />

        <dl className="mt-3 divide-y divide-amber-800/15 border-y border-amber-800/15 text-xs">
          <div className="flex items-center justify-between py-2"><dt className="text-stone-500">Cena</dt><dd className="flex items-center gap-2 text-amber-200">{originalPrice && originalPrice !== price ? <span className="game-number text-[0.68rem] text-stone-600 line-through">{originalPrice}</span> : null}<CurrencyAmount value={price} compact /></dd></div>
          <div className="flex justify-between py-2"><dt className="text-stone-500">Wymagany poziom</dt><dd className={`game-number ${locked ? 'text-amber-500' : ''}`}>{item.minLevel}</dd></div>
          {maxQuantity < 99 ? <div className="flex justify-between py-2"><dt className="text-stone-500">Dostępność</dt><dd className="game-number">{maxQuantity}</dd></div> : null}
        </dl>
        {locked ? <p className="shop-future-level-note">Możesz kupić ten przedmiot teraz, ale założysz go dopiero na poziomie {item.minLevel}.</p> : null}

        <div className="action-feedback-anchor mt-auto flex items-center justify-between gap-2 pt-4">
          <QuantitySelector value={selectedQuantity} max={safeMax} disabled={!available || purchasing} onChange={(value) => { setQuantity(value); setLocalWarning(null); }} />
          <Button className="grow" disabled={purchasing} onClick={attemptPurchase}>
            {purchasing ? 'Kupowanie…' : !available ? 'Wyprzedane' : !canAfford ? 'Za mało złota' : 'Kup'}
          </Button>
          {localWarning || error ? (
            <ActionBubble onDismiss={() => { setLocalWarning(null); onDismissError?.(); }}>
              {localWarning ?? error}
            </ActionBubble>
          ) : null}
        </div>
      </div>
    </article>
  );
}
