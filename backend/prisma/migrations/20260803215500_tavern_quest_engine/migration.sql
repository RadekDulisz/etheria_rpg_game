CREATE TYPE "TavernQuestStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CLAIMED');
CREATE TYPE "TavernChoiceAlignment" AS ENUM ('GOOD', 'NEUTRAL', 'EVIL');

CREATE TABLE "tavern_quest_runs" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "difficulty" "TavernQuestDifficulty" NOT NULL,
  "title" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "stageIndex" INTEGER NOT NULL DEFAULT 0,
  "stageCount" INTEGER NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "status" "TavernQuestStatus" NOT NULL DEFAULT 'ACTIVE',
  "result" "MissionResult",
  "goldMin" INTEGER NOT NULL,
  "goldMax" INTEGER NOT NULL,
  "experienceMin" BIGINT NOT NULL,
  "experienceMax" BIGINT NOT NULL,
  "itemChance" DOUBLE PRECISION NOT NULL,
  "gemChance" DOUBLE PRECISION NOT NULL,
  "hpRiskMinPercent" INTEGER NOT NULL,
  "hpRiskMaxPercent" INTEGER NOT NULL,
  "goldReward" BIGINT NOT NULL DEFAULT 0,
  "experienceReward" BIGINT NOT NULL DEFAULT 0,
  "reputationChange" INTEGER NOT NULL DEFAULT 0,
  "hpLost" INTEGER NOT NULL DEFAULT 0,
  "rewardItemId" TEXT,
  "rewardGemDefinitionId" TEXT,
  "endingTitle" TEXT,
  "endingText" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  CONSTRAINT "tavern_quest_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tavern_quest_decisions" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stageIndex" INTEGER NOT NULL,
  "choiceId" TEXT NOT NULL,
  "choiceTitle" TEXT NOT NULL,
  "alignment" "TavernChoiceAlignment" NOT NULL,
  "attribute" TEXT NOT NULL,
  "roll" INTEGER NOT NULL,
  "target" INTEGER NOT NULL,
  "succeeded" BOOLEAN NOT NULL,
  "scoreDelta" INTEGER NOT NULL,
  "reputationDelta" INTEGER NOT NULL,
  "outcomeText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tavern_quest_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tavern_quest_runs_characterId_status_idx" ON "tavern_quest_runs"("characterId", "status");
CREATE INDEX "tavern_quest_runs_characterId_startedAt_idx" ON "tavern_quest_runs"("characterId", "startedAt");
CREATE INDEX "tavern_quest_runs_rewardItemId_idx" ON "tavern_quest_runs"("rewardItemId");
CREATE INDEX "tavern_quest_runs_rewardGemDefinitionId_idx" ON "tavern_quest_runs"("rewardGemDefinitionId");
CREATE UNIQUE INDEX "tavern_quest_decisions_runId_stageIndex_key" ON "tavern_quest_decisions"("runId", "stageIndex");
CREATE INDEX "tavern_quest_decisions_runId_createdAt_idx" ON "tavern_quest_decisions"("runId", "createdAt");

ALTER TABLE "tavern_quest_runs" ADD CONSTRAINT "tavern_quest_runs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tavern_quest_runs" ADD CONSTRAINT "tavern_quest_runs_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tavern_quest_runs" ADD CONSTRAINT "tavern_quest_runs_rewardGemDefinitionId_fkey" FOREIGN KEY ("rewardGemDefinitionId") REFERENCES "gem_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tavern_quest_decisions" ADD CONSTRAINT "tavern_quest_decisions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "tavern_quest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
