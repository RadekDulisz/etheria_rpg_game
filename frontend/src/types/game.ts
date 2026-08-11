export type UserRole = 'PLAYER' | 'ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  testToolsEnabled: boolean;
}

export interface CharacterStats {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  unspentPoints: number;
  parryRating: number;
  attackPower: number;
  attackMin: number;
  attackMax: number;
  defensePower: number;
  criticalChance: number;
  parryChance: number;
}

export type WeaponType = 'SWORD' | 'AXE' | 'DAGGER' | 'BOW' | 'BLUNT' | 'POLEARM' | 'STAFF';

export interface WeaponExpertise {
  weaponType: WeaponType;
  level: number;
  experience: number;
  experienceInLevel: number;
  experienceToNextLevel: number;
  progressPercent: number;
  maxLevel: boolean;
  active: boolean;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  experience: string;
  experienceToNextLevel: string;
  maxHp: number;
  currentHp: number;
  healthRegeneration: {
    amount: number;
    nextHp: number;
    nextTickAt: string | null;
    intervalSeconds: number;
    percentPerTick: number;
  };
  gold: string;
  reputation: number;
  reputationRank: string;
  reputationRankColor: string;
  arenaRating: number;
  arenaWins: number;
  arenaLosses: number;
  arenaDraws: number;
  arenaRank: ArenaRank;
  avatarUrl: string | null;
  weaponExpertise: WeaponExpertise[];
  activeWeaponExpertise: WeaponExpertise | null;
  stats: CharacterStats | null;
}

export interface ArenaRank {
  title: string;
  color: string;
  frame: 'ash' | 'iron' | 'bronze' | 'silver' | 'gold' | 'crimson' | 'legend';
  threshold: number;
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

export type GemFamily = 'RUBY' | 'AMETHYST' | 'EMERALD' | 'SAPPHIRE';
export type GemTier = 'SHARD' | 'CUT' | 'FLAWLESS' | 'ROYAL' | 'ANCIENT';

export interface GemDefinition {
  id: string;
  family: GemFamily;
  tier: GemTier;
  name: string;
  description?: string;
  minLevel: number;
  iconUrl: string | null;
}

export interface ItemSocket {
  id: string;
  position: number;
  gemDefinitionId: string | null;
  gemDefinition: GemDefinition | null;
}

export interface OwnedItem {
  id: string;
  combatantId: string;
  itemId: string;
  enhancementLevel: number;
  socketCapacity: number;
  unlockedSockets: number;
  forgeFailStack: number;
  sockets: ItemSocket[];
  baseItem: Item;
  item: Item;
  quantity: 1;
  createdAt: string;
  updatedAt: string;
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

export type InventoryEntry = OwnedItem;

export interface EquippedEntry {
  combatantId: string;
  slot: string;
  ownedItemId: string;
  itemId: string;
  equippedAt: string;
  enhancementLevel: number;
  socketCapacity: number;
  unlockedSockets: number;
  sockets: ItemSocket[];
  baseItem: Item;
  item: Item;
}

export interface GemStack {
  id: string;
  combatantId: string;
  gemDefinitionId: string;
  quantity: number;
  gemDefinition: GemDefinition;
}

export interface BlacksmithItem extends OwnedItem {
  equippedSlot: EquipmentSlot | null;
  enhancementLimit: number;
  upgrade: {
    nextLevel: number;
    goldCost: string;
    successChancePercent: number;
  } | null;
  nextSocket: { position: number; goldCost: string } | null;
}

export interface BlacksmithWorkshop {
  gold: string;
  characterLevel: number;
  items: BlacksmithItem[];
  gems: GemStack[];
  gemCatalog: GemDefinition[];
}

export interface JewelerRecipe {
  inputGem: GemDefinition;
  resultGem: GemDefinition;
  inputQuantity: number;
  goldCost: string;
}

export interface JewelerItem extends OwnedItem {
  equippedSlot: EquipmentSlot | null;
}

export interface JewelerWorkshop {
  gold: string;
  characterLevel: number;
  gems: GemStack[];
  gemCatalog: GemDefinition[];
  recipes: JewelerRecipe[];
  extractionCosts: Record<GemTier, string>;
  socketedItems: JewelerItem[];
}

export type TavernDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TavernOffer {
  id: string;
  templateKey: string;
  difficulty: TavernDifficulty;
  title: string;
  region: string;
  summary: string;
  stageCount: number;
  recommendedLevel: number;
  encounterSummary: string;
  goldMin: number;
  goldMax: number;
  experienceMin: string;
  experienceMax: string;
  itemChance: number;
  gemChance: number;
  hpRiskMinPercent: number;
  hpRiskMaxPercent: number;
}

export type TavernQuestStatus = 'ACTIVE' | 'RESOLVED' | 'CLAIMED';
export type TavernChoiceAlignment = 'GOOD' | 'NEUTRAL' | 'EVIL';
export type TavernQuestAttribute = 'STR' | 'DEX' | 'CON' | 'INT';
export type TavernProvisionType = 'HEALING_POTION' | 'TRAVEL_BANDAGE' | 'VAEL_ANTIDOTE';

export interface TavernProvisionCatalogEntry {
  type: TavernProvisionType;
  name: string;
  description: string;
  effectLabel: string;
  maxPerQuest: number;
  price: string;
  owned: number;
}

export interface TavernQuestProvision {
  type: TavernProvisionType;
  initialQuantity: number;
  remaining: number;
  used: number;
  name: string;
  description: string;
  effectLabel: string;
  maxPerQuest: number;
  healPercent: number;
}

export interface TavernQuestChoice {
  id: string;
  title: string;
  description: string;
  alignment: TavernChoiceAlignment;
  attribute: TavernQuestAttribute;
  riskModifier: number;
  reputationDelta: number;
}

export interface TavernQuestChoiceStage {
  type: 'CHOICE';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  choices: TavernQuestChoice[];
}

export interface TavernQuestCombatStage {
  type: 'COMBAT';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  finalEncounter: boolean;
  enemy: {
    key: string;
    name: string;
    title: string;
    family: 'ECHO_BEAST' | 'AWAKENED_GUARDIAN' | 'VOID_ENTITY' | 'HUMAN';
    familyLabel: string;
    form: string;
    rank: 'COMMON' | 'ELITE' | 'BOSS' | 'RAID_BOSS';
    formerPurpose: string;
    fractureEffect: string;
    silhouette: string;
    uniqueDetail: string;
    description: string;
    atlasPosition: number;
    profile: 'SWIFT' | 'BRUTE' | 'WARDEN';
    signature: {
      key: string;
      name: string;
      description: string;
      counterplay: string;
      counteredBy?: { choiceIds?: string[]; puzzleKeys?: string[] };
    };
  };
}

export interface TavernQuestPuzzleStage {
  type: 'PUZZLE';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  puzzleKey: string;
  kind: 'CLUE' | 'SEQUENCE' | 'TESTIMONY';
  prompt: string;
  instruction: string;
  requiredSelections: number;
  options: Array<{ id: string; label: string; detail: string; symbol?: string }>;
  attempts: number;
  maxAttempts: number;
  feedback: string | null;
  hint: string | null;
}

export type TavernQuestStage = TavernQuestChoiceStage | TavernQuestCombatStage | TavernQuestPuzzleStage;

export interface TavernQuestPuzzle {
  id: string;
  stageIndex: number;
  puzzleKey: string;
  attempts: number;
  maxAttempts: number;
  solved: boolean | null;
  scoreDelta: number;
  outcomeText: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TavernEncounterRound {
  roundNumber: number;
  actorId: string;
  actionType: 'HIT' | 'CRITICAL_HIT' | 'MISS' | 'PARRIED';
  damageDealt: number;
  actorHpAfter: number;
  targetHpAfter: number;
}

export interface TavernQuestEncounter {
  id: string;
  stageIndex: number;
  enemyKey: string;
  enemyName: string;
  enemyTitle: string;
  enemyKind: string;
  enemyLevel: number;
  enemyIllustrationUrl: string;
  enemyMaxHp: number;
  playerHpBefore: number;
  playerHpAfter: number;
  enemyHpAfter: number;
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
  scoreDelta: number;
  rounds: TavernEncounterRound[];
  won: boolean;
  createdAt: string;
}

export interface TavernQuestDecision {
  id: string;
  stageIndex: number;
  choiceId: string;
  choiceTitle: string;
  alignment: TavernChoiceAlignment;
  attribute: TavernQuestAttribute;
  roll: number;
  target: number;
  succeeded: boolean;
  scoreDelta: number;
  reputationDelta: number;
  outcomeText: string;
  createdAt: string;
}

export interface TavernQuestRun {
  id: string;
  templateKey: string;
  difficulty: TavernDifficulty;
  title: string;
  region: string;
  summary: string;
  stageIndex: number;
  stageCount: number;
  score: number;
  status: TavernQuestStatus;
  result: 'SUCCESS' | 'FAILURE' | null;
  goldReward: string;
  experienceReward: string;
  reputationChange: number;
  hpLost: number;
  rewardItem: Item | null;
  rewardGemDefinition: GemDefinition | null;
  storyRelicItem: Item | null;
  storyRelicAwarded: boolean;
  endingKey: string | null;
  endingTitle: string | null;
  endingText: string | null;
  startedAt: string;
  resolvedAt: string | null;
  claimedAt: string | null;
  decisions: TavernQuestDecision[];
  health: { current: number; max: number };
  provisions: TavernQuestProvision[];
  encounters: TavernQuestEncounter[];
  puzzles: TavernQuestPuzzle[];
  currentStage: TavernQuestStage | null;
}

export interface TavernChronicleEntry {
  templateKey: string;
  title: string;
  region: string;
  discovered: boolean;
  completions?: number;
  successes?: number;
  failures?: number;
  bestScore?: number;
  bestEndingKey?: string | null;
  bestEndingTitle?: string | null;
  relicClaimed?: boolean;
  relicItem?: Item | null;
  firstCompletedAt?: string;
  lastCompletedAt?: string;
  endings?: Array<{
    endingKey: string;
    endingTitle: string;
    timesReached: number;
    bestScore: number;
    firstDiscoveredAt: string;
    lastReachedAt: string;
  }>;
}

export interface TavernQuestClaim extends TavernQuestRun {
  claimed: true;
  level: number;
  levelBefore: number;
  balanceAfter: string;
  health: { current: number; max: number };
  reputationAfter: number;
  reputationRank: { name: string; color: string; threshold: number; alignment: 'GOOD' | 'EVIL' | 'NEUTRAL' };
}

export interface TavernOverview {
  inn: {
    name: string;
    innkeeper: string;
    server: string;
    illustrationUrl: string;
  };
  gold: string;
  activeQuest: TavernQuestRun | null;
  provisions: {
    bagCapacity: number;
    catalog: TavernProvisionCatalogEntry[];
  };
  chronicle: {
    discovered: number;
    total: number;
    entries: TavernChronicleEntry[];
  };
  board: {
    id: string;
    generatedAt: string;
    expiresAt: string;
    refreshesUsed: number;
    refreshesRemaining: number;
    nextRefreshCost: string | null;
    offers: TavernOffer[];
  };
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
  itemRewardChance: number;
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
  rewardGemDefinition: GemDefinition | null;
  createdAt: string;
}

export interface MissionOverview {
  successChance: number;
  itemRewardChance: number;
  propertyBonus: {
    level: number;
    successPercent: number;
    goldPercent: number;
    itemChancePercent: number;
  };
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
  arenaRating: number;
  arenaRank: ArenaRank;
  reputation: number;
  reputationRank: {
    name: string;
    color: string;
    threshold: number;
    alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
  };
  entryHpCost: number;
  currentHp: number;
  canFight: boolean;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    attack: number;
    attackMin: number;
    attackMax: number;
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
  expertiseReward: {
    weaponType: WeaponType;
    experienceGained: number;
    experienceAfter: number;
    levelBefore: number;
    levelAfter: number;
    leveledUp: boolean;
  } | null;
  arenaProfile: {
    ratingBefore: number;
    ratingChange: number;
    ratingAfter: number;
    rank: ArenaRank;
    nextRank: ArenaRank | null;
    wins: number;
    losses: number;
    draws: number;
    hpCost: number;
    hpAfter: number;
    maxHp: number;
    reputationChange: number;
    reputationAfter: number;
    reputationRank: {
      name: string;
      color: string;
      threshold: number;
      alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
    };
  } | null;
}

export interface ArenaProfile {
  characterId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  position: number;
  rank: ArenaRank;
  nextRank: ArenaRank | null;
  pointsToNextRank: number;
  hpCostPercent: number;
  minimumHpPercent: number;
  leaderboard: Array<{
    id: string;
    name: string;
    level: number;
    arenaRating: number;
    arenaWins: number;
    arenaLosses: number;
    arenaDraws: number;
    position: number;
    rank: ArenaRank;
  }>;
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
  nextLevelBenefits: {
    dailyIncome: number;
    regenerationPercentPerFiveMinutes: number;
    missionSuccessPercent: number;
    missionGoldPercent: number;
    itemChancePercent: number;
    restorationCooldownMinutes: number;
  } | null;
  health: { current: number; max: number };
  regeneration: { multiplier: number; percentPerFiveMinutes: number };
  restoration: {
    actionName: string;
    goldCost: string;
    healPercent: number;
    cooldownMinutes: number;
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

export type GameView = 'overview' | 'character' | 'inventory' | 'shop' | 'merchant' | 'blacksmith' | 'jeweler' | 'tavern' | 'pve' | 'pvp' | 'guild' | 'property';

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
