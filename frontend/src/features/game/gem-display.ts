import type { GemDefinition } from '../../types/game';

export const GEM_FAMILY_LABELS: Record<GemDefinition['family'], string> = {
  RUBY: 'Rubin', AMETHYST: 'Ametyst', EMERALD: 'Szmaragd', SAPPHIRE: 'Szafir',
};

export const GEM_TIER_LABELS: Record<GemDefinition['tier'], string> = {
  SHARD: 'Szlif krągły', CUT: 'Szlif poduszkowy', FLAWLESS: 'Szlif owalny', ROYAL: 'Szlif koronny', ANCIENT: 'Szlif pradawny',
};

const POWER: Record<GemDefinition['tier'], number> = { SHARD: 1, CUT: 2, FLAWLESS: 3, ROYAL: 4, ANCIENT: 6 };
const HEALTH: Record<GemDefinition['tier'], number> = { SHARD: 4, CUT: 8, FLAWLESS: 12, ROYAL: 18, ANCIENT: 26 };

export function gemEffects(gem: GemDefinition): string[] {
  const value = POWER[gem.tier];
  switch (gem.family) {
    case 'RUBY': return [`Broń: +${value} ATK oraz +${value} do zakresu obrażeń`, `Pancerz: +${HEALTH[gem.tier]} HP`];
    case 'AMETHYST': return [`Broń: +${value} STR`, `Pancerz: +${value} CON`];
    case 'EMERALD': return [`Tarcza lub sigil: +${value} parowania`, `Pozostałe przedmioty: +${value} DEX`];
    case 'SAPPHIRE': return [`Tarcza lub sigil: +${value} DEF`, `Pozostałe przedmioty: +${value} INT`];
  }
}
