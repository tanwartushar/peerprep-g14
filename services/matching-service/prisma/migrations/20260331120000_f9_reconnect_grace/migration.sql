-- AlterEnum
ALTER TYPE "MatchRequestStatus" ADD VALUE 'RECONNECT_EXPIRED';

-- AlterTable
ALTER TABLE "MatchRequest" ADD COLUMN "disconnectedAt" TIMESTAMP(3);
ALTER TABLE "MatchRequest" ADD COLUMN "reconnectDeadlineAt" TIMESTAMP(3);
