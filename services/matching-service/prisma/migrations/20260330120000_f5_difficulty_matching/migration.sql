-- CreateEnum
CREATE TYPE "MatchingPairType" AS ENUM ('SAME_DIFFICULTY', 'DOWNWARD');

-- AlterTable
ALTER TABLE "MatchRequest" ADD COLUMN     "allowLowerDifficultyMatch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MatchRequest" ADD COLUMN     "peerRequestedDifficulty" TEXT;
ALTER TABLE "MatchRequest" ADD COLUMN     "matchingPairType" "MatchingPairType";
