-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'PROPERTY_PURCHASE';
ALTER TYPE "TransactionType" ADD VALUE 'PROPERTY_UPGRADE';
ALTER TYPE "TransactionType" ADD VALUE 'PROPERTY_INCOME';

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "baseIncome" INTEGER NOT NULL DEFAULT 100,
    "lastCollectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_upgrades" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "goldCost" INTEGER NOT NULL,
    "incomeAfter" INTEGER NOT NULL,
    "upgradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_characterId_key" ON "properties"("characterId");

-- CreateIndex
CREATE INDEX "properties_level_idx" ON "properties"("level");

-- CreateIndex
CREATE INDEX "property_upgrades_propertyId_upgradedAt_idx" ON "property_upgrades"("propertyId", "upgradedAt");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_upgrades" ADD CONSTRAINT "property_upgrades_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
