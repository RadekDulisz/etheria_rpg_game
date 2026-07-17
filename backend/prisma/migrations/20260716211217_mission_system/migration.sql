-- CreateEnum
CREATE TYPE "MissionResult" AS ENUM ('SUCCESS', 'FAILURE');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'ITEM_SALE';

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "currentHp" INTEGER,
ADD COLUMN     "healthUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "mission_progress" (
    "characterId" TEXT NOT NULL,
    "totalMissions" INTEGER NOT NULL DEFAULT 0,
    "missionsSinceTierFive" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_progress_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "mission_attempts" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outcomeText" TEXT NOT NULL,
    "result" "MissionResult" NOT NULL,
    "goldReward" BIGINT NOT NULL DEFAULT 0,
    "experienceReward" BIGINT NOT NULL DEFAULT 0,
    "hpLost" INTEGER NOT NULL,
    "rewardItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_attempts_characterId_createdAt_idx" ON "mission_attempts"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_attempts" ADD CONSTRAINT "mission_attempts_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
