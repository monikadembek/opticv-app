UPDATE "subscriptions"
SET "currentPeriodStart" = COALESCE("currentPeriodStart", now()),
    "currentPeriodEnd" = COALESCE("currentPeriodEnd", now() + interval '1 month')
WHERE "currentPeriodStart" IS NULL;
