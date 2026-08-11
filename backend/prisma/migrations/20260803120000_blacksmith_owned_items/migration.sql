-- CreateEnum
CREATE TYPE "GemFamily" AS ENUM ('RUBY', 'AMETHYST', 'EMERALD', 'SAPPHIRE');

-- CreateEnum
CREATE TYPE "GemTier" AS ENUM ('SHARD', 'CUT', 'FLAWLESS', 'ROYAL', 'ANCIENT');

-- CreateEnum
CREATE TYPE "ForgeOperationType" AS ENUM ('UPGRADE', 'SOCKET_UNLOCK', 'GEM_INSERT');

-- CreateEnum
CREATE TYPE "ForgeOperationResult" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'BLACKSMITH_UPGRADE';
ALTER TYPE "TransactionType" ADD VALUE 'BLACKSMITH_SOCKET_UNLOCK';
ALTER TYPE "TransactionType" ADD VALUE 'BLACKSMITH_GEM_INSERT';

-- CreateTable
CREATE TABLE "owned_items" (
    "id" TEXT NOT NULL,
    "combatantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "enhancementLevel" INTEGER NOT NULL DEFAULT 0,
    "socketCapacity" INTEGER NOT NULL DEFAULT 0,
    "unlockedSockets" INTEGER NOT NULL DEFAULT 0,
    "forgeFailStack" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owned_items_pkey" PRIMARY KEY ("id")
);

-- Existing equipped items receive their own instances first.
CREATE TEMPORARY TABLE "_equipped_owned_migration" (
    "combatantId" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "ownedItemId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL
);

INSERT INTO "_equipped_owned_migration" ("combatantId", "slot", "ownedItemId", "itemId")
SELECT "combatantId", "slot", gen_random_uuid()::text, "itemId"
FROM "equipped_items";

INSERT INTO "owned_items" (
    "id", "combatantId", "itemId", "socketCapacity", "createdAt", "updatedAt"
)
SELECT
    migration."ownedItemId",
    migration."combatantId",
    migration."itemId",
    CASE WHEN item."slotGroup" IN ('WEAPON', 'SHIELD_SIGIL', 'HELM', 'UPPER_BODY', 'LOWER_BODY', 'GLOVES', 'BOOTS')
      THEN CASE item."rarity"
        WHEN 'COMMON' THEN 1 WHEN 'UNCOMMON' THEN 1 WHEN 'RARE' THEN 2
        WHEN 'EPIC' THEN 2 WHEN 'LEGENDARY' THEN 3 ELSE 0 END
      ELSE 0 END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "_equipped_owned_migration" migration
JOIN "items" item ON item."id" = migration."itemId";

-- Every equipment quantity in the old stack becomes an independent instance.
INSERT INTO "owned_items" (
    "id", "combatantId", "itemId", "socketCapacity", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    inventory."combatantId",
    inventory."itemId",
    CASE WHEN item."slotGroup" IN ('WEAPON', 'SHIELD_SIGIL', 'HELM', 'UPPER_BODY', 'LOWER_BODY', 'GLOVES', 'BOOTS')
      THEN CASE item."rarity"
        WHEN 'COMMON' THEN 1 WHEN 'UNCOMMON' THEN 1 WHEN 'RARE' THEN 2
        WHEN 'EPIC' THEN 2 WHEN 'LEGENDARY' THEN 3 ELSE 0 END
      ELSE 0 END,
    inventory."createdAt",
    CURRENT_TIMESTAMP
FROM "inventory_items" inventory
JOIN "items" item ON item."id" = inventory."itemId"
CROSS JOIN LATERAL generate_series(1, inventory."quantity")
WHERE item."slotGroup" IS NOT NULL;

-- AlterTable
ALTER TABLE "equipped_items" ADD COLUMN "ownedItemId" TEXT;

UPDATE "equipped_items" equipped
SET "ownedItemId" = migration."ownedItemId"
FROM "_equipped_owned_migration" migration
WHERE equipped."combatantId" = migration."combatantId"
  AND equipped."slot" = migration."slot";

ALTER TABLE "equipped_items" ALTER COLUMN "ownedItemId" SET NOT NULL;
ALTER TABLE "equipped_items" DROP CONSTRAINT "equipped_items_itemId_fkey";
ALTER TABLE "equipped_items" DROP COLUMN "itemId";

DELETE FROM "inventory_items" inventory
USING "items" item
WHERE inventory."itemId" = item."id"
  AND item."slotGroup" IS NOT NULL;

DROP TABLE "_equipped_owned_migration";

-- CreateTable
CREATE TABLE "gem_definitions" (
    "id" TEXT NOT NULL,
    "family" "GemFamily" NOT NULL,
    "tier" "GemTier" NOT NULL,
    "name" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gem_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_stacks" (
    "combatantId" TEXT NOT NULL,
    "gemDefinitionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gem_stacks_pkey" PRIMARY KEY ("combatantId", "gemDefinitionId")
);

-- CreateTable
CREATE TABLE "item_sockets" (
    "ownedItemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "gemDefinitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_sockets_pkey" PRIMARY KEY ("ownedItemId", "position")
);

-- CreateTable
CREATE TABLE "forge_operations" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "ownedItemId" TEXT NOT NULL,
    "type" "ForgeOperationType" NOT NULL,
    "result" "ForgeOperationResult" NOT NULL,
    "goldCost" BIGINT NOT NULL DEFAULT 0,
    "fromLevel" INTEGER,
    "toLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forge_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owned_items_combatantId_createdAt_idx" ON "owned_items"("combatantId", "createdAt");
CREATE INDEX "owned_items_itemId_idx" ON "owned_items"("itemId");
CREATE UNIQUE INDEX "equipped_items_ownedItemId_key" ON "equipped_items"("ownedItemId");
CREATE UNIQUE INDEX "gem_definitions_name_key" ON "gem_definitions"("name");
CREATE UNIQUE INDEX "gem_definitions_family_tier_key" ON "gem_definitions"("family", "tier");
CREATE INDEX "item_sockets_gemDefinitionId_idx" ON "item_sockets"("gemDefinitionId");
CREATE INDEX "forge_operations_characterId_createdAt_idx" ON "forge_operations"("characterId", "createdAt");
CREATE INDEX "forge_operations_ownedItemId_createdAt_idx" ON "forge_operations"("ownedItemId", "createdAt");

ALTER TABLE "mission_attempts" ADD COLUMN "rewardGemDefinitionId" TEXT;
CREATE INDEX "mission_attempts_rewardGemDefinitionId_idx" ON "mission_attempts"("rewardGemDefinitionId");
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_rewardGemDefinitionId_fkey" FOREIGN KEY ("rewardGemDefinitionId") REFERENCES "gem_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_ownedItemId_fkey" FOREIGN KEY ("ownedItemId") REFERENCES "owned_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gem_stacks" ADD CONSTRAINT "gem_stacks_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "combatants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gem_stacks" ADD CONSTRAINT "gem_stacks_gemDefinitionId_fkey" FOREIGN KEY ("gemDefinitionId") REFERENCES "gem_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_sockets" ADD CONSTRAINT "item_sockets_ownedItemId_fkey" FOREIGN KEY ("ownedItemId") REFERENCES "owned_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_sockets" ADD CONSTRAINT "item_sockets_gemDefinitionId_fkey" FOREIGN KEY ("gemDefinitionId") REFERENCES "gem_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "forge_operations" ADD CONSTRAINT "forge_operations_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forge_operations" ADD CONSTRAINT "forge_operations_ownedItemId_fkey" FOREIGN KEY ("ownedItemId") REFERENCES "owned_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
