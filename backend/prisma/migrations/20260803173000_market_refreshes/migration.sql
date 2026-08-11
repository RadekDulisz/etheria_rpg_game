ALTER TYPE "TransactionType" ADD VALUE 'MARKET_REFRESH';

DROP INDEX IF EXISTS "shop_entries_itemId_offerDate_key";

CREATE TABLE "market_refreshes" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "offerDate" DATE NOT NULL,
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_refreshes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shop_entries" ADD COLUMN "marketRefreshId" TEXT;

CREATE UNIQUE INDEX "market_refreshes_characterId_offerDate_key"
ON "market_refreshes"("characterId", "offerDate");

CREATE INDEX "shop_entries_itemId_offerDate_idx"
ON "shop_entries"("itemId", "offerDate");

CREATE INDEX "shop_entries_marketRefreshId_idx"
ON "shop_entries"("marketRefreshId");

CREATE UNIQUE INDEX "shop_entries_global_item_day_key"
ON "shop_entries"("itemId", "offerDate")
WHERE "marketRefreshId" IS NULL;

ALTER TABLE "market_refreshes"
ADD CONSTRAINT "market_refreshes_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop_entries"
ADD CONSTRAINT "shop_entries_marketRefreshId_fkey"
FOREIGN KEY ("marketRefreshId") REFERENCES "market_refreshes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
