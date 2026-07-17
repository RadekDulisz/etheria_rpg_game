-- CreateEnum
CREATE TYPE "MissionMorality" AS ENUM ('GOOD', 'EVIL');

-- AlterTable
ALTER TABLE "mission_attempts" ADD COLUMN     "choiceDescription" TEXT,
ADD COLUMN     "choiceTitle" TEXT,
ADD COLUMN     "morality" "MissionMorality",
ADD COLUMN     "reputationChange" INTEGER NOT NULL DEFAULT 0;
