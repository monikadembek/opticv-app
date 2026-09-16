-- FREE tier no longer renews: it is assigned a period once, at signup,
-- and currentPeriodEnd stays null until the user upgrades to a paid tier.
-- The previous backfill migration set currentPeriodEnd = now() + 1 month
-- for FREE rows; clear it back to null so it no longer reads as a
-- (nonexistent) renewal date. Paid tiers are untouched.
UPDATE "subscriptions"
SET "currentPeriodEnd" = NULL
WHERE "tier" = 'FREE';
