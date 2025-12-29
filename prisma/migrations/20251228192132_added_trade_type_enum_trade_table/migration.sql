-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('long', 'short');

-- AlterTable
ALTER TABLE "ExistingTrade" ADD COLUMN     "type" "TradeType" NOT NULL DEFAULT 'long';
