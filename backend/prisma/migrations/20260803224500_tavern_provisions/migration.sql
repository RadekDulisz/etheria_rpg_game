ALTER TYPE "TransactionType" ADD VALUE 'TAVERN_PROVISION_PURCHASE';
CREATE TYPE "TavernProvisionType" AS ENUM ('HEALING_POTION', 'TRAVEL_BANDAGE', 'VAEL_ANTIDOTE');

ALTER TABLE "tavern_quest_runs"
  ADD COLUMN "startingHp" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "journeyHp" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxHpSnapshot" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "tavern_provision_stacks" (
  "characterId" TEXT NOT NULL,
  "type" "TavernProvisionType" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tavern_provision_stacks_pkey" PRIMARY KEY ("characterId", "type")
);

CREATE TABLE "tavern_quest_provisions" (
  "runId" TEXT NOT NULL,
  "type" "TavernProvisionType" NOT NULL,
  "initialQuantity" INTEGER NOT NULL,
  "remaining" INTEGER NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "tavern_quest_provisions_pkey" PRIMARY KEY ("runId", "type")
);

ALTER TABLE "tavern_provision_stacks" ADD CONSTRAINT "tavern_provision_stacks_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tavern_quest_provisions" ADD CONSTRAINT "tavern_quest_provisions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "tavern_quest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
