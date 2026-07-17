import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Character, EquippedEntry } from '../../types/game';
import { allocateStatPoint, type AllocatableStat } from '../../api/character.api';
import { getChestAppearance } from '../../lib/hero-appearance';
import { CurrencyAmount } from '../ui/CurrencyAmount';
import { ExperienceProgress } from '../ui/ExperienceProgress';
import { HealthBar } from '../ui/HealthBar';
import { ReputationMeter } from '../ui/ReputationMeter';
import { statTooltips } from '../../lib/stat-tooltips';
import { getEquipmentAttributeBonuses } from '../../lib/equipment-bonuses';
import { AdjustedStatValue } from '../ui/AdjustedStatValue';
import { getApiErrorMessage } from '../../lib/api-errors';

interface HeroRailProps {
  character: Character;
  equipment: EquippedEntry[];
}

export function HeroRail({ character, equipment }: HeroRailProps) {
  const queryClient = useQueryClient();
  const appearance = getChestAppearance(equipment);
  const equipmentBonuses = getEquipmentAttributeBonuses(equipment);
  const allocateMutation = useMutation({
    mutationFn: allocateStatPoint,
    onSuccess: async (updatedCharacter) => {
      queryClient.setQueryData(['character', 'me'], updatedCharacter);
      await queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
  const heroStats: Array<{ label: string; value: ReactNode; mark: string; tooltip: string; allocation?: AllocatableStat }> = [
    { label: 'Siła', value: <AdjustedStatValue value={character.stats?.strength ?? '—'} equipmentBonus={equipmentBonuses.strength} />, mark: 'STR', tooltip: statTooltips.strength, allocation: 'strength' },
    { label: 'Zręczność', value: <AdjustedStatValue value={character.stats?.agility ?? '—'} equipmentBonus={equipmentBonuses.agility} />, mark: 'DEX', tooltip: statTooltips.agility, allocation: 'agility' },
    { label: 'Wytrzymałość', value: <AdjustedStatValue value={character.stats?.endurance ?? '—'} equipmentBonus={equipmentBonuses.endurance} />, mark: 'CON', tooltip: statTooltips.endurance, allocation: 'endurance' },
    { label: 'Inteligencja', value: <AdjustedStatValue value={character.stats?.intelligence ?? '—'} equipmentBonus={equipmentBonuses.intelligence} />, mark: 'INT', tooltip: statTooltips.intelligence, allocation: 'intelligence' },
    { label: 'Atak', value: character.stats?.attackPower ?? '—', mark: 'ATK', tooltip: statTooltips.attack },
    { label: 'Obrona', value: character.stats?.defensePower ?? '—', mark: 'DEF', tooltip: statTooltips.defense },
    { label: 'Trafienie krytyczne', value: character.stats ? `${character.stats.criticalChance}%` : '—', mark: 'CRIT', tooltip: statTooltips.critical },
    { label: 'Parowanie', value: character.stats ? `${character.stats.parryChance}%` : '—', mark: 'PARRY', tooltip: statTooltips.parry },
    { label: 'Punkty nauki', value: character.stats?.unspentPoints ?? '—', mark: 'PTS', tooltip: statTooltips.points },
  ];
  return (
    <aside className="hero-rail">
      <div className="hero-portrait-frame">
        <span className="ornament-corner ornament-corner-tl" />
        <span className="ornament-corner ornament-corner-tr" />
        <span className="ornament-corner ornament-corner-bl" />
        <span className="ornament-corner ornament-corner-br" />
        <div className="hero-portrait">
          {character.avatarUrl ? (
            <img src={character.avatarUrl} alt={`Portret postaci ${character.name}`} className="h-full w-full object-cover" />
          ) : (
            <img src={appearance.portraitAsset} alt={`Portret postaci ${character.name}${appearance.equipped ? ' w założonym napierśniku' : ''}`} className="h-full w-full object-cover object-center" />
          )}
        </div>
      </div>

      <div className="px-4 pb-4 text-center">
        <p className="text-2xl text-amber-100 fantasy-title">{character.name}</p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: character.reputationRankColor }}>{character.reputationRank}</p>
        <HealthBar value={character.currentHp} max={character.maxHp} className="mt-3" />
      </div>

      <dl className="border-y border-amber-700/25 px-4 py-2 text-xs">
        <div className="hero-rail-row"><dt>Poziom</dt><dd>{character.level}</dd></div>
        <div className="hero-rail-row"><dt>Złoto</dt><dd><CurrencyAmount value={character.gold} compact /></dd></div>
      </dl>

      <div className="space-y-4 border-b border-amber-700/25 px-4 py-4">
        <ExperienceProgress current={character.experience} required={character.experienceToNextLevel} />
        <ReputationMeter value={character.reputation} rank={character.reputationRank} rankColor={character.reputationRankColor} />
      </div>

      <dl className="hero-stat-list">
        {heroStats.map(({ label, value, mark, tooltip, allocation }) => (
          <div key={label} className="hero-stat-row" tabIndex={0} aria-label={`${label}: ${tooltip}`}>
            <span className="hero-stat-mark" aria-hidden="true">{mark}</span>
            <dt>{label}</dt>
            <dd className="game-number">{value}</dd>
            {allocation ? (
              <button
                type="button"
                className="hero-stat-add"
                disabled={!character.stats?.unspentPoints || allocateMutation.isPending}
                aria-label={`Dodaj jeden punkt: ${label}`}
                title={character.stats?.unspentPoints ? `Dodaj punkt do atrybutu: ${label}` : 'Brak wolnych punktów nauki'}
                onClick={() => allocateMutation.mutate(allocation)}
              >
                <span>{allocateMutation.isPending && allocateMutation.variables === allocation ? '·' : '+'}</span>
              </button>
            ) : <span className="hero-stat-action-space" aria-hidden="true" />}
            <span className="stat-tooltip">{tooltip}</span>
          </div>
        ))}
      </dl>
      {allocateMutation.isError ? <p className="hero-stat-allocation-error">{getApiErrorMessage(allocateMutation.error)}</p> : null}
    </aside>
  );
}
