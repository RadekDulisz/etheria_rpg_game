ALTER TABLE "tavern_quest_runs"
  ADD COLUMN "endingKey" TEXT,
  ADD COLUMN "storyRelicAwarded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storyRelicItemId" TEXT;

CREATE TABLE "tavern_chronicle_entries" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "completions" INTEGER NOT NULL DEFAULT 0,
  "successes" INTEGER NOT NULL DEFAULT 0,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "bestScore" INTEGER NOT NULL DEFAULT -999,
  "bestEndingKey" TEXT,
  "bestEndingTitle" TEXT,
  "relicClaimed" BOOLEAN NOT NULL DEFAULT false,
  "relicItemId" TEXT,
  "firstCompletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastCompletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tavern_chronicle_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tavern_chronicle_endings" (
  "id" TEXT NOT NULL,
  "chronicleEntryId" TEXT NOT NULL,
  "endingKey" TEXT NOT NULL,
  "endingTitle" TEXT NOT NULL,
  "timesReached" INTEGER NOT NULL DEFAULT 1,
  "bestScore" INTEGER NOT NULL,
  "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tavern_chronicle_endings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tavern_quest_runs_storyRelicItemId_idx" ON "tavern_quest_runs"("storyRelicItemId");
CREATE UNIQUE INDEX "tavern_chronicle_entries_characterId_templateKey_key" ON "tavern_chronicle_entries"("characterId", "templateKey");
CREATE INDEX "tavern_chronicle_entries_characterId_lastCompletedAt_idx" ON "tavern_chronicle_entries"("characterId", "lastCompletedAt" DESC);
CREATE INDEX "tavern_chronicle_entries_relicItemId_idx" ON "tavern_chronicle_entries"("relicItemId");
CREATE UNIQUE INDEX "tavern_chronicle_endings_chronicleEntryId_endingKey_key" ON "tavern_chronicle_endings"("chronicleEntryId", "endingKey");
CREATE INDEX "tavern_chronicle_endings_chronicleEntryId_firstDiscoveredAt_idx" ON "tavern_chronicle_endings"("chronicleEntryId", "firstDiscoveredAt");

ALTER TABLE "tavern_quest_runs" ADD CONSTRAINT "tavern_quest_runs_storyRelicItemId_fkey"
  FOREIGN KEY ("storyRelicItemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tavern_chronicle_entries" ADD CONSTRAINT "tavern_chronicle_entries_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tavern_chronicle_entries" ADD CONSTRAINT "tavern_chronicle_entries_relicItemId_fkey"
  FOREIGN KEY ("relicItemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tavern_chronicle_endings" ADD CONSTRAINT "tavern_chronicle_endings_chronicleEntryId_fkey"
  FOREIGN KEY ("chronicleEntryId") REFERENCES "tavern_chronicle_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
