import { applyExperienceGain, expRequiredForLevel, STAT_POINTS_PER_LEVEL } from './leveling';

describe('leveling', () => {
  describe('expRequiredForLevel', () => {
    it('rosnie liniowo z poziomem', () => {
      expect(expRequiredForLevel(1)).toBe(100n);
      expect(expRequiredForLevel(2)).toBe(200n);
      expect(expRequiredForLevel(5)).toBe(500n);
    });
  });

  describe('applyExperienceGain', () => {
    it('nie awansuje poziomu, gdy zdobyte exp nie wystarcza', () => {
      const result = applyExperienceGain(1, 0n, 50n);

      expect(result.level).toBe(1);
      expect(result.experience).toBe(50n);
      expect(result.unspentPointsGained).toBe(0);
    });

    it('awansuje o jeden poziom, gdy exp dokladnie wystarcza', () => {
      const result = applyExperienceGain(1, 0n, 100n);

      expect(result.level).toBe(2);
      expect(result.experience).toBe(0n);
      expect(result.unspentPointsGained).toBe(STAT_POINTS_PER_LEVEL);
    });

    it('obsluguje wielokrotny awans w jednym wywolaniu', () => {
      // lvl1->2 kosztuje 100, lvl2->3 kosztuje 200 - lacznie 300 na dwa awanse
      const result = applyExperienceGain(1, 0n, 300n);

      expect(result.level).toBe(3);
      expect(result.experience).toBe(0n);
      expect(result.unspentPointsGained).toBe(STAT_POINTS_PER_LEVEL * 2);
    });

    it('zachowuje nadwyzke exp ponizej progu kolejnego poziomu', () => {
      const result = applyExperienceGain(1, 0n, 150n);

      expect(result.level).toBe(2);
      expect(result.experience).toBe(50n);
    });

    it('uwzglednia juz posiadane exp przy starcie', () => {
      const result = applyExperienceGain(2, 150n, 60n);

      // prog na lvl2->3 to 200; 150+60=210 -> awans, nadwyzka 10
      expect(result.level).toBe(3);
      expect(result.experience).toBe(10n);
    });
  });
});
