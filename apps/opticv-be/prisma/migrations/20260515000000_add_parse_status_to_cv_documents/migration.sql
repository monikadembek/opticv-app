-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "cv_documents" ADD COLUMN "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING';
