-- AlterTable: add a user-facing display name to every CV document
ALTER TABLE "cv_documents" ADD COLUMN "name" VARCHAR(100);

-- Backfill: uploads get their file name without the last extension (max 100 chars);
-- builder CVs (no file) and extension-only names fall back to 'Untitled CV'.
UPDATE "cv_documents"
  SET "name" = LEFT(
    COALESCE(NULLIF(regexp_replace("fileName", '\.[^.]+$', ''), ''), 'Untitled CV'),
    100);

ALTER TABLE "cv_documents" ALTER COLUMN "name" SET NOT NULL;
