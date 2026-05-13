Proposed Schema

The schema is organized around 5 core domains:

1. User — mirrors Supabase auth, stores app-level profile + billing state

2. CvDocument — uploaded CVs (PDF/DOCX), with parsed text stored for AI reuse

3. JobApplication — links a CV + job description, the central entity per optimization run

4. OptimizationResult — one row per prompt type per application (7 prompt types in MVP)

5. Subscription / UsageLog — billing tier enforcement and token cost tracking

---

generator client {
provider = "prisma-client"
output = "../src/generated/prisma"
previewFeatures = ["driverAdapters"]
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum SubscriptionTier {
FREE
PRO
PRO_ANNUAL
SPRINT // 7-day one-time access
}

enum SubscriptionStatus {
ACTIVE
CANCELED
PAST_DUE
TRIALING
}

enum PromptType {
RESUME_AUTOPSY
KEYWORD_GAP
SUMMARY_REWRITE
BULLET_UPGRADE
COVER_LETTER
INTERVIEW_PREP
LINKEDIN_REWRITE
}

enum OutputStatus {
PENDING
PROCESSING
COMPLETED
FAILED
}

// ─── User ─────────────────────────────────────────────────────────────────────

model User {
id String @id @default(uuid())
supabaseId String @unique // auth.users.id from Supabase
email String @unique
displayName String?
avatarUrl String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

subscription Subscription?
cvDocuments CvDocument[]
applications JobApplication[]
usageLogs UsageLog[]

@@map("users")
}

// ─── Subscription ─────────────────────────────────────────────────────────────

model Subscription {
id String @id @default(uuid())
userId String @unique
user User @relation(fields: [userIe: Cascade)

tier SubscriptionTier @default(FREE)
status SubscriptionStatus @default(ACTIVE)

stripeCustomerId String? @unique
stripeSubscriptionId String? @unique
stripePriceId String?

currentPeriodStart DateTime?
currentPeriodEnd DateTime? // null for FREE; set for Sprint expiry too
cancelAtPeriodEnd Boolean @default(false)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("subscriptions")
}

// ─── CV Document ──────────────────────────────────────────────────────────────

CvDocument {
id String @id @default(uuid())
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

fileName String
fileSize Int // bytes
mimeType String // application/pdf | application/vnd.openxmlformats...
storageKey String // Cloudflare R2 object key
parsedText String? // extracted plain text, cached after first parse
isActive Boolean @default(true)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

applications JobApplication[]

@@map("cv_documents")
}

// ─── Job Application ───────────────────────────────────────────
// Central entity: one CV + one job description = one optimization run

model JobApplication {
id String @id @default(uuid())
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
cvDocumentId String
cvDocument CvDocument @relation(fields: [cvDocumentId], references: [id])

jobTitle String?
companyName String?
jobDescription String // raw pasted text
atsScore Int? // 0–100, populated after KEYWORD_GAP run
notes String?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

optimizationResults OptimizationResult[]

@@map("job_applications")
}

// ─── AI Output ────────────────────────────────────────────────────────────────
// One row per prompt type per application. Re-running overwrites via upsert.

model OptimizationResult {
id String @id @default(uuid())
applicationId String
application JobApplication @relation(fields: [applicationIe: Cascade)

promptType PromptType
promptVersionId String? // FK to PromptVersion — which
promptVersion PromptVersion? @relation(fields: [promptVersionId], references: [id])

status OutputStatus @default(PENDING)
inputTokens Int?
outputTokens Int?

// Structured JSON for KEYWORD_GAP, RESUME_AUTOPSY, INTERVIEW_PREP, BULLET_UPGRADE
structuredOutput Json?
// Free-text for SUMMARY_REWRITE, COVER_LETTER, LINKEDIN_REWRITE
textOutput String?
// User's edited version (null until user makes changes)
userEditedOutput String?

errorMessage String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// One output per prompt type per application
@@unique([applicationId, promptType])
@@map("ai_outputs")
}

// ─── Prompt Version ───────────────────────────────────────────────────────────
// Versioned prompt templates — enables A/B testing and iteration tracking

model PromptVersion {
id String @id @default(uuid())
promptType PromptType
version Int
isActive Boolean @default(false) // only one active per promptType
systemPrompt String
userPromptTemplate String // Handlebars/mustache template with {{cv}}, {{jd}} etc.
modelId String // e.g. "gpt-4o", "claude-opus-4-7"
notes String?

createdAt DateTime @default(now())

optimizationResults OptimizationResult[]

@@unique([promptType, version])
@@map("prompt_versions")
}

// ─── Usage Log ────────────────────────────────────────────────────────────────
// Per-user token tracking for billing accuracy and abuse detectio

model UsageLog {
id String @id @default(uuid())
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

promptType PromptType
modelId String
inputTokens Int
outputTokens Int
costUsd Decimal @db.Decimal(10, 6) // calculated at log time

createdAt DateTime @default(now())

@@index([userId, createdAt])
@@map("usage_logs")
}

---

Key design decisions

OptimizationResult has @@unique([applicationId, promptType]) — so re-running a prompt is always an upsert, not appending rows. This keeps queries simple: one output per workflow per application.

parsedText on CvDocument — cached after the first parse so you never re-parse the same file for a second application run.

PromptVersion table — as noted in the app overview's architecture ned in the DB. The active flag pattern (one isActive = true perpromptType) makes deployment of new prompts trivial.

UsageLog is separate from OptimizationResult — OptimizationResult tracks the final stopend-only ledger used for billing calculations. You'll query it with SUM(costUsd) WHERE userId = ? AND createdAt > periodStart.

No ExportedFile table yet — PDF/DOCX exports can be derived from OptimizationResult on demand; add a table when you need to persist download history or impose download limits per tier.

Subscription.currentPeriodEnd — used for both Stripe subscription ass expiry. NULL for free users.
