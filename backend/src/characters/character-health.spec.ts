import { getCurrentHp } from './character-health';

describe('getCurrentHp', () => {
  const now = new Date('2026-07-16T12:00:00.000Z');

  it('treats a missing stored value as full health', () => {
    expect(getCurrentHp(null, 100, now, now)).toBe(100);
  });

  it('regenerates 5% every five minutes and never exceeds maximum health', () => {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(getCurrentHp(40, 100, tenMinutesAgo, now)).toBe(50);
    expect(getCurrentHp(98, 100, tenMinutesAgo, now)).toBe(100);
  });

  it('applies the regeneration multiplier granted by a property', () => {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(getCurrentHp(40, 100, tenMinutesAgo, now, 1.5)).toBe(56);
  });
});
