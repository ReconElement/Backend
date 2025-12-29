/*
  Warnings:

  - Added the required column `assetPrice` to the `ExistingTrade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExistingTrade" ADD COLUMN     "assetPrice" DOUBLE PRECISION NOT NULL;
