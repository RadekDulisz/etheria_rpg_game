export function getReputationAlignment(value: number): 'DOBRY' | 'ZŁY' | 'NEUTRALNY' {
  if (value > 0) return 'DOBRY';
  if (value < 0) return 'ZŁY';
  return 'NEUTRALNY';
}

export function formatSignedReputation(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export const REPUTATION_VISUAL_LIMIT = 10000;
