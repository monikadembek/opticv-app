/*
  Warnings:

  - The values [PRO_ANNUAL,SPRINT] on the enum `SubscriptionTier` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "LimitedFeature" AS ENUM ('CV_OPTIMIZATION', 'COVER_LETTER', 'INTERVIEW_PREP', 'LINKEDIN');

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionTier_new" AS ENUM ('FREE', 'BASIC', 'PRO');
ALTER TABLE "public"."subscriptions" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "tier" TYPE "SubscriptionTier_new" USING ("tier"::text::"SubscriptionTier_new");
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";
DROP TYPE "public"."SubscriptionTier_old";
ALTER TABLE "subscriptions" ALTER COLUMN "tier" SET DEFAULT 'FREE';
COMMIT;

-- CreateTable
CREATE TABLE "usage_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "LimitedFeature" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_quotas_userId_periodStart_idx" ON "usage_quotas"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "usage_quotas_userId_feature_periodStart_key" ON "usage_quotas"("userId", "feature", "periodStart");

-- AddForeignKey
ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
