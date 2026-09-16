# Implementation Plan

## Source

Task: 35-cors  
Spec: `.claude/specs/tasks/35-cors/02-spec.md`  
Review: `.claude/specs/tasks/35-cors/03-spec-review.md` — **PASS**

---

## Overview

Five files are modified. No new files are created. No dependencies need to be installed. Changes flow in this order: env files → validation schema → configuration mapping → bootstrap.

---

## Steps

### Step 1 — Add `CORS_ORIGIN` to `development.env`

**File:** `apps/opticv-be/config/env/development.env`

Append a new line after the `BULLMQ_CONCURRENCY` entry (before the rate-limiting comment block):

```
CORS_ORIGIN=http://localhost:4200
```

---

### Step 2 — Add `CORS_ORIGIN` to `production.env`

**File:** `apps/opticv-be/config/env/production.env`

Append a new line after the `BULLMQ_CONCURRENCY` entry (before the rate-limiting comment block):

```
CORS_ORIGIN=https://opticv.com
```

---

### Step 3 — Add validation rule in `validation.ts`

**File:** `apps/opticv-be/config/validation.ts`

Add to the existing Joi object schema:

```
CORS_ORIGIN: Joi.string().uri().required()
```

Place it after the `BULLMQ_CONCURRENCY` entry and before the throttler entries, consistent with the ordering in the env files.

---

### Step 4 — Map the value in `configuration.ts`

**File:** `apps/opticv-be/config/configuration.ts`

Add a top-level `corsOrigin` key to the returned config object:

```
corsOrigin: process.env.CORS_ORIGIN
```

Place it after the `port` entry, alongside the other top-level scalar values.

---

### Step 5 — Apply CORS config in `main.ts`

**File:** `apps/opticv-be/src/main.ts`

Replace the existing call:

```
app.enableCors();
```

with:

```
app.enableCors({ origin: configService.get<string>('corsOrigin') });
```

No other changes to `main.ts`.

---

## Verification Checklist

- [ ] `npm exec nx build opticv-be` — build passes
- [ ] `npm exec nx test opticv-be` — all tests pass (no new tests required)
- [ ] `npm exec nx typecheck opticv-be` — no type errors
- [ ] `npm run start-be:dev` — server starts without errors; CORS_ORIGIN value logged or confirmed via startup without exceptions
- [ ] Manual: request from `http://localhost:4200` succeeds; request from another origin is rejected
- [ ] Manual: removing `CORS_ORIGIN` from `development.env` causes Joi validation error at startup

---

## Files Modified

| File | Action |
|---|---|
| `apps/opticv-be/config/env/development.env` | Modified — add `CORS_ORIGIN` |
| `apps/opticv-be/config/env/production.env` | Modified — add `CORS_ORIGIN` |
| `apps/opticv-be/config/validation.ts` | Modified — add Joi rule |
| `apps/opticv-be/config/configuration.ts` | Modified — add `corsOrigin` mapping |
| `apps/opticv-be/src/main.ts` | Modified — pass origin option to `enableCors` |
