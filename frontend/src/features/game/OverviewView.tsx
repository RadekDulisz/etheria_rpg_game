import { formatInteger } from '../../lib/formatters';
import { formatSignedReputation } from '../../lib/reputation';
import type { Character, EquippedEntry } from '../../types/game';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { GamePanel } from '../../components/ui/GamePanel';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatTile } from '../../components/ui/StatTile';
import { statTooltips } from '../../lib/stat-tooltips';
import { getEquipmentAttributeBonuses } from '../../lib/equipment-bonuses';
import { AdjustedStatValue } from '../../components/ui/AdjustedStatValue';

interface OverviewViewProps {
  character: Character;
  equipment: EquippedEntry[];
}

export function OverviewView({ character, equipment }: OverviewViewProps) {
  const equipmentBonuses = getEquipmentAttributeBonuses(equipment);
  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Twierdza bohatera" title={`Witaj ponownie, ${character.name}`} description="Najważniejsze informacje o bohaterze i jego przygotowaniu do kolejnej wyprawy." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile mark="LVL" label="Poziom" value={character.level} detail={<span style={{ color: character.reputationRankColor }}>{character.reputationRank}</span>} />
        <StatTile mark="XP" label="Doświadczenie" value={`${formatInteger(character.experience)} XP`} detail={`Do kolejnego poziomu: ${formatInteger(character.experienceToNextLevel)} XP`} />
        <StatTile mark="GOLD" label="Złoto" value={<CurrencyAmount value={character.gold} />} detail="Dostępne monety" />
        <StatTile mark="REP" label="Reputacja" value={formatSignedReputation(character.reputation)} detail={<span style={{ color: character.reputationRankColor }}>{character.reputationRank}</span>} />
      </div>

      <div className="mt-4">
        <GamePanel title="Atrybuty bojowe" eyebrow="Bohater">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile mark="STR" label="Siła" value={<AdjustedStatValue value={character.stats?.strength ?? '—'} equipmentBonus={equipmentBonuses.strength} />} detail="Obrażenia broni ciężkich" tooltip={statTooltips.strength} />
            <StatTile mark="DEX" label="Zręczność" value={<AdjustedStatValue value={character.stats?.agility ?? '—'} equipmentBonus={equipmentBonuses.agility} />} detail="Trafienie i ciosy krytyczne" tooltip={statTooltips.agility} />
            <StatTile mark="CON" label="Wytrzymałość" value={<AdjustedStatValue value={character.stats?.endurance ?? '—'} equipmentBonus={equipmentBonuses.endurance} />} detail="Punkty życia i obrona" tooltip={statTooltips.endurance} />
            <StatTile mark="INT" label="Inteligencja" value={<AdjustedStatValue value={character.stats?.intelligence ?? '—'} equipmentBonus={equipmentBonuses.intelligence} />} detail="Kostury i parowanie" tooltip={statTooltips.intelligence} />
            <StatTile mark="ATK" label="Siła ataku" value={character.stats?.attackPower ?? '—'} detail="Po wyposażeniu" tooltip={statTooltips.attack} />
            <StatTile mark="DEF" label="Obrona" value={character.stats?.defensePower ?? '—'} detail="Po wyposażeniu" tooltip={statTooltips.defense} />
            <StatTile mark="CRIT" label="Szansa na trafienie krytyczne" value={character.stats ? `${character.stats.criticalChance}%` : '—'} detail="Z atrybutów i wyposażenia" tooltip={statTooltips.critical} />
            <StatTile mark="PARRY" label="Szansa parowania" value={character.stats ? `${character.stats.parryChance}%` : '—'} detail={`Ocena parowania: ${character.stats?.parryRating ?? '—'}`} tooltip={statTooltips.parry} />
            <StatTile mark="PTS" label="Wolne punkty" value={character.stats?.unspentPoints ?? '—'} detail="Do rozdysponowania" tooltip={statTooltips.points} />
          </div>
        </GamePanel>
      </div>
    </div>
  );
}
