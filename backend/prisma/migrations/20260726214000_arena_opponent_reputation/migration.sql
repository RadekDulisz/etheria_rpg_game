ALTER TABLE "bots"
ADD COLUMN "reputation" INTEGER NOT NULL DEFAULT 0;

WITH ranked_bots AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS position
  FROM "bots"
)
UPDATE "bots" AS bot
SET "reputation" = CASE
  WHEN MOD(ranked_bots.position, 2) = 0
    THEN 25 + MOD((ranked_bots.position * 73)::INTEGER, 1176)
  ELSE -(25 + MOD((ranked_bots.position * 73)::INTEGER, 1176))
END
FROM ranked_bots
WHERE bot."id" = ranked_bots."id";
