import type { Character, EquippedEntry, GameView } from '../../types/game';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { AdjustedStatValue } from '../../components/ui/AdjustedStatValue';
import { getEquipmentAttributeBonuses } from '../../lib/equipment-bonuses';
import { formatInteger } from '../../lib/formatters';

interface OverviewViewProps {
  character: Character;
  equipment: EquippedEntry[];
  onNavigate: (view: GameView) => void;
}

const commandActions: Array<{ view: GameView; mark: string; title: string; detail: string }> = [
  { view: 'pve', mark: 'VI', title: 'Wyrusz na wyprawę', detail: 'Zdobądź złoto, doświadczenie i przedmioty.' },
  { view: 'pvp', mark: 'VII', title: 'Wejdź na arenę', detail: 'Sprawdź siłę bohatera w pojedynku.' },
  { view: 'inventory', mark: 'III', title: 'Otwórz zbrojownię', detail: 'Porównaj przedmioty i przygotuj ekwipunek.' },
  { view: 'property', mark: 'IX', title: 'Doglądaj posiadłości', detail: 'Rozwijaj ziemie i odzyskuj zdrowie.' },
];

export function OverviewView({ character, equipment, onNavigate }: OverviewViewProps) {
  const equipmentBonuses = getEquipmentAttributeBonuses(equipment);
  const hpPercent = percent(character.currentHp, character.maxHp);
  const experiencePercent = percent(Number(character.experience), Number(character.experienceToNextLevel));
  const activeExpertise = character.activeWeaponExpertise;
  const recommendation = getRecommendation(character, equipment.length);

  const attributes = [
    { mark: 'STR', label: 'Siła', value: character.stats?.strength ?? '—', bonus: equipmentBonuses.strength },
    { mark: 'DEX', label: 'Zręczność', value: character.stats?.agility ?? '—', bonus: equipmentBonuses.agility },
    { mark: 'CON', label: 'Wytrzymałość', value: character.stats?.endurance ?? '—', bonus: equipmentBonuses.endurance },
    { mark: 'INT', label: 'Inteligencja', value: character.stats?.intelligence ?? '—', bonus: equipmentBonuses.intelligence },
  ];

  return (
    <div className="fortress-overview view-enter">
      <section className="fortress-hall">
        <div className="fortress-hall-heading">
          <span>Twierdza</span>
          <h1>Centrum dowodzenia</h1>
        </div>
        <article className="fortress-hall-order">
          <span>Aktualny priorytet</span>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.detail}</p>
          <button type="button" onClick={() => onNavigate(recommendation.view)}>{recommendation.action}</button>
        </article>
        <div className="fortress-hall-ledger">
          <div>
            <small>Zdrowie</small>
            <strong className="game-number">{character.currentHp} / {character.maxHp} HP</strong>
            <i><span style={{ width: `${hpPercent}%` }} /></i>
          </div>
          <div>
            <small>Doświadczenie</small>
            <strong className="game-number">{formatInteger(character.experience)} / {formatInteger(character.experienceToNextLevel)} XP</strong>
            <i><span style={{ width: `${experiencePercent}%` }} /></i>
          </div>
          <div>
            <small>Skarbiec</small>
            <strong><CurrencyAmount value={character.gold} /></strong>
          </div>
          <div>
            <small>Reputacja</small>
            <strong className="game-number" style={{ color: character.reputationRankColor }}>{character.reputation > 0 ? '+' : ''}{character.reputation} · {character.reputationRank}</strong>
          </div>
        </div>
      </section>

      <section className="fortress-command">
        <header>
          <div><span>Centrum dowodzenia</span><h2>Co dziś zapiszą kroniki?</h2></div>
        </header>
        <div className="fortress-command-grid">
          {commandActions.map((action) => (
            <button key={action.view} type="button" onClick={() => onNavigate(action.view)}>
              <span>{action.mark}</span>
              <strong>{action.title}</strong>
              <small>{action.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="fortress-dashboard">
        <section className="fortress-readiness">
          <header><span>Stan gotowości</span><h2>Przygotowanie bohatera</h2></header>
          <FortressMeter label="Zdrowie" value={`${character.currentHp} / ${character.maxHp} HP`} percent={hpPercent} tone={hpPercent <= 50 ? 'danger' : 'health'} />
          <FortressMeter label="Droga do awansu" value={`${formatInteger(character.experience)} / ${formatInteger(character.experienceToNextLevel)} XP`} percent={experiencePercent} tone="experience" />
          <FortressMeter label="Obsadzone miejsca" value={`${equipment.length} / 18`} percent={percent(equipment.length, 18)} tone="equipment" />
          {activeExpertise ? <FortressMeter label={`Biegłość: ${activeExpertise.weaponType === 'SWORD' ? 'Miecz' : 'Aktywna broń'}`} value={`Poziom ${activeExpertise.level} · ${activeExpertise.experienceInLevel}/${activeExpertise.experienceToNextLevel} EXP`} percent={activeExpertise.progressPercent} tone="expertise" /> : null}
        </section>

        <section className="fortress-combat">
          <header><span>Bilans bojowy</span><h2>Siła w liczbach</h2></header>
          <div className="fortress-combat-grid">
            <article><small>ATK</small><strong className="game-number">{character.stats ? `${character.stats.attackMin}–${character.stats.attackMax}` : '—'}</strong><span>Zakres obrażeń</span></article>
            <article><small>DEF</small><strong className="game-number">{character.stats?.defensePower ?? '—'}</strong><span>Redukcja obrażeń</span></article>
            <article><small>CRIT</small><strong className="game-number">{character.stats ? `${character.stats.criticalChance}%` : '—'}</strong><span>Trafienie krytyczne</span></article>
            <article><small>PARRY</small><strong className="game-number">{character.stats ? `${character.stats.parryChance}%` : '—'}</strong><span>Szansa parowania</span></article>
          </div>
          <div className="fortress-attributes">
            {attributes.map((attribute) => (
              <div key={attribute.mark}>
                <span>{attribute.mark}</span>
                <small>{attribute.label}</small>
                <strong className="game-number"><AdjustedStatValue value={attribute.value} equipmentBonus={attribute.bonus} /></strong>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

function FortressMeter({ label, value, percent: meterPercent, tone }: { label: string; value: string; percent: number; tone: string }) {
  return <div className={`fortress-meter fortress-meter-${tone}`}>
    <div><span>{label}</span><strong className="game-number">{value}</strong></div>
    <div className="fortress-meter-track"><i style={{ width: `${meterPercent}%` }} /></div>
  </div>;
}

function percent(value: number, maximum: number) {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(100, value / maximum * 100));
}

function getRecommendation(character: Character, equipmentCount: number): { title: string; detail: string; action: string; view: GameView } {
  if (character.currentHp <= character.maxHp * 0.5) {
    return { title: 'Rany wymagają uwagi', detail: 'Bohater nie powinien wyruszać w drogę w takim stanie. Udaj się do posiadłości i odzyskaj siły.', action: 'Przejdź do posiadłości', view: 'property' };
  }
  if ((character.stats?.unspentPoints ?? 0) > 0) {
    return { title: 'Niewykorzystany potencjał', detail: 'Masz wolne punkty nauki. Rozdziel je przed kolejnym pojedynkiem, aby natychmiast wzmocnić bohatera.', action: 'Rozwiń bohatera', view: 'character' };
  }
  if (equipmentCount < 6) {
    return { title: 'Zbrojownia czeka', detail: 'Kilka podstawowych miejsc wyposażenia pozostaje pustych. Kupiec może pomóc uzupełnić braki.', action: 'Odwiedź kupca', view: 'merchant' };
  }
  return { title: 'Bohater jest gotowy', detail: 'Zdrowie i wyposażenie pozwalają podjąć kolejne wyzwanie. Wyprawa przyniesie złoto, doświadczenie i szansę na łup.', action: 'Wyrusz na wyprawę', view: 'pve' };
}
