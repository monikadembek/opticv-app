/*
  Warnings:

  - You are about to drop the column `modelId` on the `prompt_versions` table. All the data in the column will be lost.
  - Added the required column `modelPreference` to the `prompt_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "prompt_versions" DROP COLUMN "modelId",
ADD COLUMN     "maxTokens" INTEGER,
ADD COLUMN     "modelPreference" TEXT NOT NULL,
ADD COLUMN     "outputSchema" JSONB,
ALTER COLUMN "version" SET DATA TYPE TEXT;
