-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CombatantType" AS ENUM ('PLAYER', 'BOT');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('WEAPON', 'SHIELD_SIGIL', 'ARMOR', 'ACCESSORY', 'SPECIAL', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "SlotGroup" AS ENUM ('WEAPON', 'SHIELD_SIGIL', 'HELM', 'UPPER_BODY', 'LOWER_BODY', 'GLOVES', 'BOOTS', 'CLOAK', 'SHIRT', 'NECKLACE', 'EARRING', 'RING', 'BELT', 'BRACELET', 'BROOCH', 'HAIR_ACCESSORY');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('WEAPON', 'SHIELD_SIGIL', 'HELM', 'UPPER_BODY', 'LOWER_BODY', 'GLOVES', 'BOOTS', 'CLOAK', 'SHIRT', 'NECKLACE', 'EARRING_1', 'EARRING_2', 'RING_1', 'RING_2', 'BELT', 'BRACELET', 'BROOCH', 'HAIR_ACCESSORY');

-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('SWORD', 'AXE', 'DAGGER', 'BOW', 'BLUNT', 'POLEARM', 'STAFF');

-- CreateEnum
CREATE TYPE "BattleType" AS ENUM ('PVE', 'PVP');

-- CreateEnum
CREATE TYPE "BattleResult" AS ENUM ('ATTACKER_WIN', 'DEFENDER_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "BattleActionType" AS ENUM ('HIT', 'CRITICAL_HIT', 'MISS', 'PARRIED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SHOP_PURCHASE', 'BATTLE_REWARD', 'QUEST_REWARD', 'GUILD_WAR_REWARD', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GuildMemberRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuildWarStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combatants" (
    "id" TEXT NOT NULL,
    "type" "CombatantType" NOT NULL,

    CONSTRAINT "combatants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "combatantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "gold" BIGINT NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL,
    "combatantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "expReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combatant_stats" (
    "combatantId" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "agility" INTEGER NOT NULL DEFAULT 5,
    "endurance" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "unspentPoints" INTEGER NOT NULL DEFAULT 0,
    "parryRating" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combatant_stats_pkey" PRIMARY KEY ("combatantId")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ItemCategory" NOT NULL,
    "slotGroup" "SlotGroup",
    "weaponType" "WeaponType",
    "maxStack" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL DEFAULT 0,
    "iconUrl" TEXT,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "strengthBonus" INTEGER NOT NULL DEFAULT 0,
    "agilityBonus" INTEGER NOT NULL DEFAULT 0,
    "enduranceBonus" INTEGER NOT NULL DEFAULT 0,
    "intelligenceBonus" INTEGER NOT NULL DEFAULT 0,
    "attackPower" INTEGER NOT NULL DEFAULT 0,
    "defensePower" INTEGER NOT NULL DEFAULT 0,
    "parryBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "combatantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipped_items" (
    "combatantId" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "itemId" TEXT NOT NULL,
    "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipped_items_pkey" PRIMARY KEY ("combatantId","slot")
);

-- CreateTable
CREATE TABLE "combatant_weapon_expertise" (
    "combatantId" TEXT NOT NULL,
    "weaponType" "WeaponType" NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combatant_weapon_expertise_pkey" PRIMARY KEY ("combatantId","weaponType")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "type" "BattleType" NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "result" "BattleResult" NOT NULL,
    "expReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_rounds" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actionType" "BattleActionType" NOT NULL,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "actorHpAfter" INTEGER,
    "targetHpAfter" INTEGER,

    CONSTRAINT "battle_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_entries" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "offerDate" DATE NOT NULL,
    "priceOverride" INTEGER,
    "stockLimit" INTEGER,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderCharacterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" "GuildMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_wars" (
    "id" TEXT NOT NULL,
    "attackerGuildId" TEXT NOT NULL,
    "defenderGuildId" TEXT NOT NULL,
    "startedByCharacterId" TEXT NOT NULL,
    "winnerGuildId" TEXT,
    "status" "GuildWarStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "guild_wars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "characters_combatantId_key" ON "characters"("combatantId");

-- CreateIndex
CREATE UNIQUE INDEX "characters_userId_key" ON "characters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bots_combatantId_key" ON "bots"("combatantId");

-- CreateIndex
CREATE UNIQUE INDEX "items_name_key" ON "items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_combatantId_itemId_key" ON "inventory_items"("combatantId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "battle_rounds_battleId_roundNumber_actorId_key" ON "battle_rounds"("battleId", "roundNumber", "actorId");

-- CreateIndex
CREATE INDEX "transactions_characterId_createdAt_idx" ON "transactions"("characterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shop_entries_itemId_offerDate_key" ON "shop_entries"("itemId", "offerDate");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_leaderCharacterId_key" ON "guilds"("leaderCharacterId");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_characterId_key" ON "guild_members"("characterId");

-- CreateIndex
CREATE INDEX "guild_members_guildId_idx" ON "guild_members"("guildId");

-- CreateIndex
CREATE INDEX "guild_wars_status_startedAt_idx" ON "guild_wars"("status", "startedAt");

-- CreateIndex
CREATE INDEX "guild_wars_attackerGuildId_defenderGuildId_idx" ON "guild_wars"("attackerGuildId", "defenderGuildId");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combatant_stats" ADD CONSTRAINT "combatant_stats_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combatant_weapon_expertise" ADD CONSTRAINT "combatant_weapon_expertise_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "combatants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "combatants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "combatants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_entries" ADD CONSTRAINT "shop_entries_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leaderCharacterId_fkey" FOREIGN KEY ("leaderCharacterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_wars" ADD CONSTRAINT "guild_wars_attackerGuildId_fkey" FOREIGN KEY ("attackerGuildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_wars" ADD CONSTRAINT "guild_wars_defenderGuildId_fkey" FOREIGN KEY ("defenderGuildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_wars" ADD CONSTRAINT "guild_wars_startedByCharacterId_fkey" FOREIGN KEY ("startedByCharacterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_wars" ADD CONSTRAINT "guild_wars_winnerGuildId_fkey" FOREIGN KEY ("winnerGuildId") REFERENCES "guilds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
