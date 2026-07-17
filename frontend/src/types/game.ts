export type UserRole = 'PLAYER' | 'ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface CharacterStats {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  unspentPoints: number;
  parryRating: number;
  attackPower: number;
  defensePower: number;
  criticalChance: number;
  parryChance: number;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  experience: string;
  experienceToNextLevel: string;
  maxHp: number;
  currentHp: number;
  gold: string;
  reputation: number;
  reputationRank: string;
  reputationRankColor: string;
  avatarUrl: string | null;
  stats: CharacterStats | null;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  grade: ItemGrade;
  slotGroup: string | null;
  weaponType: string | null;
  maxStack: number;
  price: number;
  iconUrl: string | null;
  minLevel: number;
  strengthBonus: number;
  agilityBonus: number;
  enduranceBonus: number;
  intelligenceBonus: number;
  attackPower: number;
  damageMin: number;
  damageMax: number;
  defensePower: number;
  parryBonus: number;
  maxHpBonus: number;
  criticalChanceBonus: number;
}

export interface CatalogItem extends Item {
  locked: boolean;
}

export type CatalogSection = 'WEAPONS' | 'ARMOR' | 'JEWELRY' | 'SPECIAL';
export type ItemGrade = 'NO_GRADE' | 'D' | 'C' | 'B' | 'A' | 'S' | 'RUNIC' | 'ANCIENT';

export interface CatalogPage {
  items: CatalogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CatalogSummaryEntry {
  section: CatalogSection;
  count: number;
  grades: Array<{ grade: ItemGrade; count: number }>;
}

export interface InventoryEntry {
  id: string;
  combatantId: string;
  itemId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  item: Item;
}

export interface EquippedEntry {
  combatantId: string;
  slot: string;
  itemId: string;
  equippedAt: string;
  item: Item;
}

export interface ShopOffer {
  id: string;
  itemId: string;
  offerDate: string;
  priceOverride: number | null;
  discountPercent: number | null;
  stockLimit: number | null;
  quantitySold: number;
  createdAt: string;
  item: Item;
  locked: boolean;
}

export interface MissionTier {
  tier: number;
  name: string;
  chance: number;
  goldMin: number;
  goldMax: number;
  experienceMin: number;
  experienceMax: number;
  hpPercentMin: number;
  hpPercentMax: number;
}

export interface MissionAttempt {
  id: string;
  tier: number;
  title: string;
  description: string;
  outcomeText: string;
  result: 'SUCCESS' | 'FAILURE';
  morality: MissionMorality | null;
  choiceTitle: string | null;
  choiceDescription: string | null;
  reputationChange: number;
  goldReward: string;
  experienceReward: string;
  hpLost: number;
  rewardItem: Item | null;
  createdAt: string;
}

export interface MissionOverview {
  successChance: number;
  itemRewardChance: number;
  totalMissions: number;
  missionsUntilGuaranteedTierFive: number;
  health: { current: number; max: number };
  tiers: MissionTier[];
  history: MissionAttempt[];
}

export interface MissionResult extends MissionAttempt {
  health: { current: number; max: number };
  level: number;
  balanceAfter: string;
  reputationAfter: number;
  reputationRank: { name: string; color: string; threshold: number; alignment: 'GOOD' | 'EVIL' | 'NEUTRAL' };
}

export type MissionMorality = 'GOOD' | 'EVIL';

export interface ArenaOpponent {
  id: string;
  combatantId: string;
  name: string;
  level: number;
  maxHp: number;
  expReward: number;
  goldReward: number;
  challenge: 'KORZYSTNY' | 'WYRÓWNANY' | 'WYMAGAJĄCY';
  powerRatio: number;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    attack: number;
    defense: number;
  };
}

export interface ArenaBattleRound {
  id: string;
  roundNumber: number;
  actorId: string;
  actionType: 'HIT' | 'CRITICAL_HIT' | 'MISS' | 'PARRIED';
  damageDealt: number;
  actorHpAfter: number;
  targetHpAfter: number;
}

export interface ArenaBattleResult {
  id: string;
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
  expReward: number;
  goldReward: number;
  rounds: ArenaBattleRound[];
  attacker: { combatantId: string; name: string; level: number; maxHp: number };
  defender: { combatantId: string; name: string; level: number; maxHp: number };
}

export interface GuildSummary {
  id: string;
  name: string;
  description: string | null;
  leaderCharacterId: string;
  leaderCharacterName: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuildMember {
  characterId: string;
  characterName: string;
  level: number;
  role: 'LEADER' | 'MEMBER';
  joinedAt: string;
}

export interface GuildDetails extends GuildSummary {
  members: GuildMember[];
}

export interface GuildWar {
  id: string;
  attackerGuildId: string;
  attackerGuildName: string;
  defenderGuildId: string;
  defenderGuildName: string;
  winnerGuildId: string | null;
  winnerGuildName: string | null;
  status: 'ACTIVE' | 'FINISHED';
  summary: string | null;
  startedByCharacterId: string;
  startedByCharacterName: string;
  startedAt: string;
  finishedAt: string | null;
  rewardPerMember?: string | null;
}

export interface PropertyUpgrade {
  id: string;
  fromLevel: number;
  toLevel: number;
  goldCost: number;
  incomeAfter: number;
  upgradedAt: string;
}

export interface PlayerProperty {
  id: string;
  characterId: string;
  name: string;
  description: string | null;
  level: number;
  baseIncome: number;
  dailyIncome: number;
  collectableIncome: number;
  nextUpgradeCost: string;
  purchaseCost: string;
  maxLevel: number;
  nextLevelRequiredCharacterLevel: number | null;
  currentElement: string;
  nextElement: string | null;
  health: { current: number; max: number };
  regeneration: { multiplier: number; percentPerFiveMinutes: number };
  restoration: {
    actionName: string;
    goldCost: string;
    healPercent: number;
    readyAt: string | null;
    secondsRemaining: number;
    available: boolean;
  };
  reputationBonus: {
    alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
    title: string;
    missionSuccessPercent: number;
    missionGoldPercent: number;
    itemChancePercent: number;
  };
  lastCollectedAt: string;
  createdAt: string;
  updatedAt: string;
  upgrades: PropertyUpgrade[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export type GameView = 'overview' | 'character' | 'inventory' | 'shop' | 'merchant' | 'pve' | 'pvp' | 'guild' | 'property';

export type EquipmentSlot =
  | 'WEAPON'
  | 'SHIELD_SIGIL'
  | 'HELM'
  | 'UPPER_BODY'
  | 'LOWER_BODY'
  | 'GLOVES'
  | 'BOOTS'
  | 'CLOAK'
  | 'SHIRT'
  | 'NECKLACE'
  | 'EARRING_1'
  | 'EARRING_2'
  | 'RING_1'
  | 'RING_2'
  | 'BELT'
  | 'BRACELET'
  | 'BROOCH'
  | 'HAIR_ACCESSORY';
