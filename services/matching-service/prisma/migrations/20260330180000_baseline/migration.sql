-- Clean slate when types/table already exist (e.g. old migrations on Supabase, empty tables).
DROP TABLE IF EXISTS "MatchRequest" CASCADE;
DROP TYPE IF EXISTS "MatchingPairType" CASCADE;
DROP TYPE IF EXISTS "MatchRequestStatus" CASCADE;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MatchRequestStatus" AS ENUM ('PENDING', 'MATCHED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "MatchingPairType" AS ENUM ('SAME_DIFFICULTY', 'DOWNWARD');

-- CreateTable
CREATE TABLE "MatchRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "allowLowerDifficultyMatch" BOOLEAN NOT NULL DEFAULT false,
    "timeAvailableMinutes" INTEGER,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "peerUserId" TEXT,
    "peerMatchRequestId" TEXT,
    "peerRequestedDifficulty" TEXT,
    "peerTimeAvailableMinutes" INTEGER,
    "matchingPairType" "MatchingPairType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchRequest_topic_programmingLanguage_idx" ON "MatchRequest"("topic", "programmingLanguage");

-- CreateIndex
CREATE INDEX "MatchRequest_status_topic_programmingLanguage_difficulty_idx" ON "MatchRequest"("status", "topic", "programmingLanguage", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRequest_one_pending_per_user" ON "MatchRequest"("userId") WHERE ("status" = 'PENDING');
