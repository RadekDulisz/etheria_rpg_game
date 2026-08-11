CREATE TABLE "tavern_quest_encounters" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "enemyKey" TEXT NOT NULL,
    "enemyName" TEXT NOT NULL,
    "enemyTitle" TEXT NOT NULL,
    "enemyKind" TEXT NOT NULL,
    "enemyLevel" INTEGER NOT NULL,
    "enemyIllustrationUrl" TEXT NOT NULL,
    "enemyMaxHp" INTEGER NOT NULL,
    "playerHpBefore" INTEGER NOT NULL,
    "playerHpAfter" INTEGER NOT NULL,
    "enemyHpAfter" INTEGER NOT NULL,
    "result" "BattleResult" NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "rounds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tavern_quest_encounters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tavern_quest_encounters_runId_stageIndex_key"
ON "tavern_quest_encounters"("runId", "stageIndex");

CREATE INDEX "tavern_quest_encounters_runId_createdAt_idx"
ON "tavern_quest_encounters"("runId", "createdAt");

ALTER TABLE "tavern_quest_encounters"
ADD CONSTRAINT "tavern_quest_encounters_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "tavern_quest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
