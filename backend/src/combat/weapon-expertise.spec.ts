import {
  calculateExpertiseDamageBonus,
  calculateWeaponExpertiseProgress,
  experienceToNextExpertiseLevel,
} from './weapon-expertise';

describe('krzywa bieglosci broni', () => {
  it('zaczyna od poziomu 1 i wymaga 75 EXP na pierwszy awans', () => {
    expect(calculateWeaponExpertiseProgress(0)).toMatchObject({
      level: 1,
      experienceInLevel: 0,
      experienceToNextLevel: 75,
      progressPercent: 0,
      maxLevel: false,
    });
    expect(calculateWeaponExpertiseProgress(74).level).toBe(1);
    expect(calculateWeaponExpertiseProgress(75)).toMatchObject({
      level: 2,
      experienceInLevel: 0,
      experienceToNextLevel: 100,
    });
  });

  it('zwieksza koszt kolejnego awansu o 25 EXP', () => {
    expect(experienceToNextExpertiseLevel(1)).toBe(75);
    expect(experienceToNextExpertiseLevel(2)).toBe(100);
    expect(experienceToNextExpertiseLevel(10)).toBe(300);
  });

  it('przelicza stare 2400 EXP na poziom 12 bez utraty EXP', () => {
    expect(calculateWeaponExpertiseProgress(2400)).toMatchObject({
      level: 12,
      totalExperience: 2400,
      experienceInLevel: 200,
      experienceToNextLevel: 350,
    });
  });

  it('ogranicza bieglosc do poziomu 20', () => {
    expect(calculateWeaponExpertiseProgress(5700)).toMatchObject({
      level: 20,
      progressPercent: 100,
      maxLevel: true,
    });
    expect(calculateWeaponExpertiseProgress(100_000).level).toBe(20);
  });

  it('daje najwyzej 10 punktow ataku', () => {
    expect(calculateExpertiseDamageBonus(1)).toBe(0);
    expect(calculateExpertiseDamageBonus(2)).toBe(1);
    expect(calculateExpertiseDamageBonus(20)).toBe(10);
    expect(calculateExpertiseDamageBonus(49)).toBe(10);
  });
});
