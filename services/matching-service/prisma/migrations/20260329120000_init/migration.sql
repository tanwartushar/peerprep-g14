-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MatchRequestStatus" AS ENUM ('PENDING', 'MATCHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MatchRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchRequest_topic_programmingLanguage_idx" ON "MatchRequest"("topic", "programmingLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRequest_one_pending_per_user" ON "MatchRequest"("userId") WHERE ("status" = 'PENDING');
