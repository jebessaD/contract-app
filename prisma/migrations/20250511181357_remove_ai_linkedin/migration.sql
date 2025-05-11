/*
  Warnings:

  - You are about to drop the column `augmentedAnswers` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `linkedinData` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "augmentedAnswers",
DROP COLUMN "linkedinData";
