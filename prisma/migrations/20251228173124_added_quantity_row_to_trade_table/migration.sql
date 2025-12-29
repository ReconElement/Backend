/*
  Warnings:

  - Added the required column `quantity` to the `ExistingTrade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExistingTrade" ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL;
