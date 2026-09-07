import type { TavernDifficulty } from '../../types/game';

const DIFFICULTY_FALLBACK: Record<TavernDifficulty, string> = {
  EASY: '/assets/missions/mission-tier-2.jpg',
  MEDIUM: '/assets/missions/mission-tier-3.jpg',
  HARD: '/assets/missions/mission-tier-5.jpg',
};

const QUEST_ART: Partial<Record<string, string>> = {
  'ash-road-lantern': '/assets/tavern/quests/ash-road-lantern.png',
  'mill-below-walls': '/assets/tavern/quests/mill-below-walls.png',
  'vael-courier': '/assets/tavern/quests/vael-courier.png',
  'stone-bridge-voices': '/assets/tavern/quests/stone-bridge-voices.png',
  'ashen-phoenix-order': '/assets/tavern/quests/ashen-phoenix-order.png',
  'raven-tithe': '/assets/tavern/quests/raven-tithe.png',
  'drowned-bells': '/assets/tavern/quests/drowned-bells.png',
  'bone-chimera-heart': '/assets/tavern/quests/bone-chimera-heart.png',
  'last-seal-asterion': '/assets/tavern/quests/last-seal-asterion.png',
};

const ENEMY_ART: Partial<Record<string, string>> = {
  'ash-pack-memory': '/assets/tavern/enemies/ash-pack-memory-v2.png',
  'mill-ghoul': '/assets/tavern/enemies/mill-ghoul-v2.png',
  'marsh-wisp': '/assets/tavern/enemies/marsh-wisp-v4.png',
  'vael-drowned-knight': '/assets/tavern/enemies/vael-drowned-knight.png',
  'vael-spire-warden': '/assets/tavern/enemies/vael-spire-warden-v2.png',
  'phoenix-hunter': '/assets/tavern/enemies/phoenix-hunter-v2.png',
  'phoenix-revenant': '/assets/tavern/enemies/phoenix-revenant-v2.png',
  'raven-harpy': '/assets/tavern/enemies/raven-harpy.png',
  'raven-matriarch': '/assets/tavern/enemies/raven-matriarch.png',
  'bell-drowned': '/assets/tavern/enemies/bell-drowned.png',
  'chapel-warden': '/assets/tavern/enemies/chapel-warden.png',
  'thirteenth-bell': '/assets/tavern/enemies/thirteenth-bell.png',
  'necropolis-custodian': '/assets/tavern/enemies/necropolis-custodian.png',
  'seal-golem': '/assets/tavern/enemies/seal-golem.png',
  'void-cultist': '/assets/tavern/enemies/void-cultist-v2.png',
  'fractured-knight': '/assets/tavern/enemies/fractured-knight-v2.png',
  'asterion-remnant': '/assets/tavern/enemies/asterion-remnant.png',
};

export function tavernQuestArt(templateKey: string, difficulty: TavernDifficulty): string {
  return QUEST_ART[templateKey] ?? DIFFICULTY_FALLBACK[difficulty];
}

export function tavernEnemyArt(enemyKey: string, fallback: string): { src: string; individual: boolean } {
  const src = ENEMY_ART[enemyKey];
  return src ? { src, individual: true } : { src: fallback, individual: false };
}
