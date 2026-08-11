import type { CharacterStats, EquippedEntry, Item } from '../../types/game';
import { getCompatibleSlots } from '../../features/game/equipment-slots';
import {
  formatSignedPercent,
  itemCritPercent,
  itemParryPercent,
  MAX_CRIT_PERCENT,
  MAX_PARRY_PERCENT,
} from '../../lib/combat-display';

interface ItemComparisonProps {
  item: Item;
  equipment: EquippedEntry[];
  characterStats: CharacterStats | null;
  compact?: boolean;
}

interface ComparisonRow {
  label: string;
  value: string;
  direction: 'positive' | 'negative' | 'mixed' | 'neutral';
}

export function ItemComparison({
  item,
  equipment,
  characterStats,
  compact = false,
}: ItemComparisonProps) {
  const slots = getCompatibleSlots(item.slotGroup);
  if (!slots.length) return null;

  const equippedInSlots = equipment.filter((entry) => slots.some((slot) => slot === entry.slot));
  const compared = equippedInSlots.length < slots.length
    ? null
    : [...equippedInSlots].sort((left, right) => itemPower(left.item) - itemPower(right.item))[0];
  const rows = getComparisonRows(item, compared?.item, equipment, characterStats);

  return (
    <section
      className={`item-comparison ${compact ? 'item-comparison-compact' : ''}`}
      aria-label={`Porównanie przedmiotu ${item.name}`}
    >
      <div className="item-comparison-heading">
        <span>Względem wyposażenia</span>
        <strong title={compared?.item.name}>{compared?.item.name ?? 'Wolne miejsce'}</strong>
      </div>
      <div className="item-comparison-deltas">
        {rows.length ? rows.map((row) => (
          <span className={`item-comparison-delta item-comparison-${row.direction}`} key={row.label}>
            <small>{row.label}</small>
            <b className="game-number">{row.value}</b>
          </span>
        )) : <span className="item-comparison-equal">Brak zmian statystyk</span>}
      </div>
    </section>
  );
}

function getComparisonRows(
  next: Item,
  current: Item | undefined,
  equipment: EquippedEntry[],
  characterStats: CharacterStats | null,
): ComparisonRow[] {
  const base = current ?? emptyItemStats;
  const rows: ComparisonRow[] = [];
  const attackDelta = characterStats
    ? calculateAttackRangeDelta(next, current, equipment, characterStats)
    : null;
  if (attackDelta) {
    rows.push({
      label: 'Atak',
      value: attackDelta.min === 0 && attackDelta.max === 0
        ? 'Bez zmian'
        : attackDelta.min === attackDelta.max
        ? signed(attackDelta.min)
        : `${signed(attackDelta.min)} / ${signed(attackDelta.max)}`,
      direction: attackDelta.min === 0 && attackDelta.max === 0
        ? 'neutral'
        : direction(attackDelta.min + attackDelta.max, attackDelta.min, attackDelta.max),
    });
  }
  const damageMin = next.damageMin - base.damageMin;
  const damageMax = next.damageMax - base.damageMax;
  if (damageMin !== 0 || damageMax !== 0) {
    rows.push({
      label: 'Obrażenia',
      value: damageMin === damageMax
        ? signed(damageMin)
        : `${signed(damageMin)} / ${signed(damageMax)}`,
      direction: direction(damageMin + damageMax, damageMin, damageMax),
    });
  }

  addDelta(rows, 'Obrona', next.defensePower - base.defensePower);
  addDelta(rows, 'STR', next.strengthBonus - base.strengthBonus);
  addDelta(rows, 'DEX', next.agilityBonus - base.agilityBonus);
  addDelta(rows, 'CON', next.enduranceBonus - base.enduranceBonus);
  addDelta(rows, 'INT', next.intelligenceBonus - base.intelligenceBonus);
  addDelta(rows, 'HP', next.maxHpBonus - base.maxHpBonus);
  const parryDelta = characterStats
    ? calculateEffectiveParryDelta(next, current, characterStats)
    : itemParryPercent(next.parryBonus - base.parryBonus);
  if (Math.abs(parryDelta) >= 0.005) {
    rows.push({
      label: 'Parowanie',
      value: formatSignedPercent(parryDelta),
      direction: parryDelta > 0 ? 'positive' : 'negative',
    });
  }
  const critDelta = characterStats
    ? calculateEffectiveCritDelta(next, current, characterStats)
    : itemCritPercent(next.criticalChanceBonus - base.criticalChanceBonus);
  if (Math.abs(critDelta) >= 0.005) {
    rows.push({
      label: 'Trafienie krytyczne',
      value: formatSignedPercent(critDelta),
      direction: critDelta > 0 ? 'positive' : 'negative',
    });
  }
  return rows;
}

const EQUIPMENT_DAMAGE_MULTIPLIER = 1.2;
const PRIMARY_ATTRIBUTE_TO_DAMAGE = 0.5;
const BASE_UNARMED_ATTACK = 3;

function calculateEffectiveParryDelta(
  next: Item,
  current: Item | undefined,
  stats: CharacterStats,
): number {
  const bonusDeltaPercent = itemParryPercent(next.parryBonus - (current?.parryBonus ?? 0));
  const nextParryChance = Math.min(
    MAX_PARRY_PERCENT,
    Math.max(0, stats.parryChance + bonusDeltaPercent),
  );

  return Math.round((nextParryChance - stats.parryChance) * 100) / 100;
}

function calculateEffectiveCritDelta(
  next: Item,
  current: Item | undefined,
  stats: CharacterStats,
): number {
  const ratingDeltaPercent = itemCritPercent(
    next.criticalChanceBonus - (current?.criticalChanceBonus ?? 0),
  );
  const nextCritChance = Math.min(
    MAX_CRIT_PERCENT,
    Math.max(0, stats.criticalChance + ratingDeltaPercent),
  );

  return Math.round((nextCritChance - stats.criticalChance) * 100) / 100;
}

function calculateAttackRangeDelta(
  next: Item,
  current: Item | undefined,
  equipment: EquippedEntry[],
  stats: CharacterStats,
): { min: number; max: number } {
  const activeWeapon = equipment.find((entry) => entry.slot === 'WEAPON')?.item;
  const currentWeaponType = activeWeapon?.weaponType ?? null;
  const nextWeaponType = next.slotGroup === 'WEAPON' ? next.weaponType : currentWeaponType;
  const currentPrimary = primaryAttribute(stats, currentWeaponType);
  const nextStats = {
    strength: stats.strength - (current?.strengthBonus ?? 0) + next.strengthBonus,
    agility: stats.agility - (current?.agilityBonus ?? 0) + next.agilityBonus,
    intelligence: stats.intelligence - (current?.intelligenceBonus ?? 0) + next.intelligenceBonus,
  };
  const nextPrimary = primaryAttribute(nextStats, nextWeaponType);

  const equippedDamageMin = equipment.reduce((total, entry) => total + entry.item.damageMin, 0);
  const equippedDamageMax = equipment.reduce((total, entry) => total + entry.item.damageMax, 0);
  const currentRawMin = equippedDamageMin || BASE_UNARMED_ATTACK;
  const currentRawMax = equippedDamageMax || BASE_UNARMED_ATTACK;
  const nextDamageMin = equippedDamageMin - (current?.damageMin ?? 0) + next.damageMin;
  const nextDamageMax = equippedDamageMax - (current?.damageMax ?? 0) + next.damageMax;
  const nextRawMin = nextDamageMin || BASE_UNARMED_ATTACK;
  const nextRawMax = nextDamageMax || BASE_UNARMED_ATTACK;

  // Biegłość nie jest osobną cechą przedmiotu. Wyciągamy jej aktualny wkład
  // z zakresu zwróconego przez backend, dzięki czemu porównanie uwzględnia
  // pełny obecny build, a nie tylko surowe liczby na dwóch przedmiotach.
  const inferredExpertise = Math.max(
    0,
    stats.attackMin -
      Math.floor(currentRawMin * EQUIPMENT_DAMAGE_MULTIPLIER) -
      Math.floor(currentPrimary * PRIMARY_ATTRIBUTE_TO_DAMAGE),
  );
  const predictedMin =
    Math.floor(nextRawMin * EQUIPMENT_DAMAGE_MULTIPLIER) +
    Math.floor(nextPrimary * PRIMARY_ATTRIBUTE_TO_DAMAGE) +
    inferredExpertise;
  const predictedMax =
    Math.floor(nextRawMax * EQUIPMENT_DAMAGE_MULTIPLIER) +
    Math.floor(nextPrimary * PRIMARY_ATTRIBUTE_TO_DAMAGE) +
    inferredExpertise;

  return {
    min: predictedMin - stats.attackMin,
    max: predictedMax - stats.attackMax,
  };
}

function primaryAttribute(
  stats: Pick<CharacterStats, 'strength' | 'agility' | 'intelligence'>,
  weaponType: string | null,
): number {
  if (weaponType === 'DAGGER' || weaponType === 'BOW') return stats.agility;
  if (weaponType === 'STAFF') return stats.intelligence;
  return stats.strength;
}

function addDelta(rows: ComparisonRow[], label: string, value: number, suffix = '') {
  if (value === 0) return;
  rows.push({ label, value: `${signed(value)}${suffix}`, direction: value > 0 ? 'positive' : 'negative' });
}

function direction(sum: number, first: number, second: number): ComparisonRow['direction'] {
  if (first > 0 && second > 0) return 'positive';
  if (first < 0 && second < 0) return 'negative';
  return sum === 0 ? 'mixed' : sum > 0 ? 'positive' : 'negative';
}

function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return value < 0 ? `−${Math.abs(value)}` : '0';
}

function itemPower(item: Item): number {
  return ((item.damageMin + item.damageMax) / 2) * 2
    + item.attackPower * 2
    + item.defensePower * 2
    + item.strengthBonus * 3
    + item.agilityBonus * 3
    + item.enduranceBonus * 3
    + item.intelligenceBonus * 3
    + item.maxHpBonus * 0.35
    + item.parryBonus
    + item.criticalChanceBonus * 0.8;
}

const emptyItemStats = {
  damageMin: 0,
  damageMax: 0,
  attackPower: 0,
  defensePower: 0,
  strengthBonus: 0,
  agilityBonus: 0,
  enduranceBonus: 0,
  intelligenceBonus: 0,
  maxHpBonus: 0,
  parryBonus: 0,
  criticalChanceBonus: 0,
};
