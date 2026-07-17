import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { RarityBadge } from '../../components/ui/RarityBadge';
import { GameIcon } from '../../components/ui/GameIcon';
import { itemCategoryIcon } from '../../lib/game-icons';
import { formatItemCategory } from '../../lib/formatters';
import type { Item } from '../../types/game';

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
}

export function ShopItemCard({ item, price, originalPrice, discountPercent, characterGold, locked, maxQuantity = 99, purchasing, onPurchase }: ShopItemCardProps) {
  const [quantity, setQuantity] = useState(1);
  const safeMax = Math.max(maxQuantity, 1);
  const selectedQuantity = Math.min(quantity, safeMax);
  const canAfford = BigInt(characterGold) >= BigInt(price * selectedQuantity);
  const available = maxQuantity > 0;
  const canPurchase = !locked && available && canAfford;

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

        <dl className="mt-3 divide-y divide-amber-800/15 border-y border-amber-800/15 text-xs">
          <div className="flex items-center justify-between py-2"><dt className="text-stone-500">Cena</dt><dd className="flex items-center gap-2 text-amber-200">{originalPrice && originalPrice !== price ? <span className="game-number text-[0.68rem] text-stone-600 line-through">{originalPrice}</span> : null}<CurrencyAmount value={price} compact /></dd></div>
          <div className="flex justify-between py-2"><dt className="text-stone-500">Wymagany poziom</dt><dd className="game-number">{item.minLevel}</dd></div>
          {maxQuantity < 99 ? <div className="flex justify-between py-2"><dt className="text-stone-500">Dostępność</dt><dd className="game-number">{maxQuantity}</dd></div> : null}
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <QuantitySelector value={selectedQuantity} max={safeMax} disabled={!available || purchasing} onChange={setQuantity} />
          <Button className="grow" disabled={!canPurchase || purchasing} onClick={() => onPurchase(selectedQuantity)}>
            {purchasing ? 'Kupowanie…' : locked ? `Poziom ${item.minLevel}` : !available ? 'Wyprzedane' : !canAfford ? 'Za mało złota' : 'Kup'}
          </Button>
        </div>
      </div>
    </article>
  );
}
