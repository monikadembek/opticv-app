-- Enable Row Level Security on every table in the public schema.
-- No policies are defined, so the Supabase Data API (anon / authenticated
-- roles) is denied all access. The backend connects as the table owner
-- (postgres) and bypasses RLS, so Prisma is unaffected.
-- Do NOT use FORCE ROW LEVEL SECURITY — it would block the backend too.
-- New tables added in later migrations must enable RLS as well.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cv_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "optimization_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prompt_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_quotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
