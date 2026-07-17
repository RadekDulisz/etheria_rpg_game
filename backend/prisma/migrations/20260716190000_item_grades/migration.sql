-- CreateEnum
CREATE TYPE "ItemGrade" AS ENUM ('NO_GRADE', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84');

-- AlterTable
ALTER TABLE "items" ADD COLUMN "grade" "ItemGrade" NOT NULL DEFAULT 'NO_GRADE';

