CREATE TABLE "tavern_quest_puzzles" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "puzzleKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "solved" BOOLEAN,
    "selectedAnswer" JSONB,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "outcomeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "tavern_quest_puzzles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tavern_quest_puzzles_runId_stageIndex_key"
ON "tavern_quest_puzzles"("runId", "stageIndex");

CREATE INDEX "tavern_quest_puzzles_runId_createdAt_idx"
ON "tavern_quest_puzzles"("runId", "createdAt");

ALTER TABLE "tavern_quest_puzzles"
ADD CONSTRAINT "tavern_quest_puzzles_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "tavern_quest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
