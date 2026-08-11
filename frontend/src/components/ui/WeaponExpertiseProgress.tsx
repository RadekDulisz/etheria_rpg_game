import type { WeaponExpertise } from '../../types/game';
import { getWeaponTypeLabel } from '../../lib/weapon-expertise';

interface WeaponExpertiseProgressProps {
  expertise: WeaponExpertise;
  compact?: boolean;
}

export function WeaponExpertiseProgress({
  expertise,
  compact = false,
}: WeaponExpertiseProgressProps) {
  const label = getWeaponTypeLabel(expertise.weaponType);

  return (
    <article
      className={`weapon-expertise ${compact ? 'weapon-expertise-compact' : ''} ${expertise.active ? 'weapon-expertise-active' : ''}`}
      aria-label={expertise.maxLevel
        ? `Biegłość: ${label}, maksymalny poziom ${expertise.level}`
        : `Biegłość: ${label}, poziom ${expertise.level}, ${expertise.experienceInLevel} z ${expertise.experienceToNextLevel} EXP`}
    >
      <div className="weapon-expertise-body">
        <header>
          {expertise.active ? <span className="weapon-expertise-kicker">Aktywna biegłość</span> : null}
          <div className="weapon-expertise-title-row">
            <strong>{label}</strong>
            <b className="game-number">Poziom {expertise.level}</b>
          </div>
        </header>
        <div className="weapon-expertise-track" aria-hidden="true">
          <i style={{ width: `${expertise.progressPercent}%` }} />
          <em style={{ left: `${expertise.progressPercent}%` }} />
        </div>
        <footer>
          {expertise.maxLevel ? (
            <span className="weapon-expertise-max">Maksymalna biegłość</span>
          ) : (
            <>
              <span className="game-number">
                {expertise.experienceInLevel}/{expertise.experienceToNextLevel} EXP
              </span>
              <span>{expertise.progressPercent}%</span>
            </>
          )}
        </footer>
      </div>
    </article>
  );
}
