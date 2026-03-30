-- AlterTable
ALTER TABLE "MatchRequest" ADD COLUMN "peerUserId" TEXT;
ALTER TABLE "MatchRequest" ADD COLUMN "peerMatchRequestId" TEXT;

-- CreateIndex
CREATE INDEX "MatchRequest_status_topic_programmingLanguage_difficulty_idx" ON "MatchRequest"("status", "topic", "programmingLanguage", "difficulty");
