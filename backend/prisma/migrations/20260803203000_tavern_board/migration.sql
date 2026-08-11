ALTER TYPE "TransactionType" ADD VALUE 'TAVERN_REFRESH';

CREATE TYPE "TavernQuestDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TABLE "tavern_boards" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshDate" DATE NOT NULL,
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tavern_boards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tavern_offers" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "difficulty" "TavernQuestDifficulty" NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "stageCount" INTEGER NOT NULL,
    "recommendedLevel" INTEGER NOT NULL,
    "encounterSummary" TEXT NOT NULL,
    "goldMin" INTEGER NOT NULL,
    "goldMax" INTEGER NOT NULL,
    "experienceMin" BIGINT NOT NULL,
    "experienceMax" BIGINT NOT NULL,
    "itemChance" DOUBLE PRECISION NOT NULL,
    "gemChance" DOUBLE PRECISION NOT NULL,
    "hpRiskMinPercent" INTEGER NOT NULL,
    "hpRiskMaxPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tavern_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tavern_boards_characterId_key" ON "tavern_boards"("characterId");
CREATE INDEX "tavern_offers_boardId_difficulty_idx" ON "tavern_offers"("boardId", "difficulty");

ALTER TABLE "tavern_boards" ADD CONSTRAINT "tavern_boards_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tavern_offers" ADD CONSTRAINT "tavern_offers_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "tavern_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
