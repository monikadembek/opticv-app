-- DropForeignKey
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_cvDocumentId_fkey";

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_cvDocumentId_fkey" FOREIGN KEY ("cvDocumentId") REFERENCES "cv_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
