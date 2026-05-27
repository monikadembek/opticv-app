# Implementation Plan — Task 36: Add Helmet middleware for better security

## Overview

Install the `helmet` package and apply it as global Express middleware in the NestJS bootstrap function. This is a single-file change plus a dependency install — no modules, services, tests, or DB changes required.

---

## Step 1 — Install dependency

Run from the workspace root:

```
npm install helmet
```

`helmet` v8+ ships with its own TypeScript declarations; no `@types/helmet` is needed.

---

## Step 2 — Apply Helmet in `main.ts`

**File:** `apps/opticv-be/src/main.ts`

1. Add an import for `helmet` at the top of the file (after existing imports).
2. Call `app.use(helmet())` immediately after `NestFactory.create(AppModule)` resolves — before `app.setGlobalPrefix()`, `app.useGlobalPipes()`, `app.enableCors()`, and `app.listen()`.

The call order in `bootstrap()` after the change:

```
NestFactory.create(AppModule)
app.use(helmet())          ← insert here
app.setGlobalPrefix(...)
app.useGlobalPipes(...)
app.useGlobalFilters(...)
app.enableCors(...)
app.listen(port)
```

No other files are modified.

---

## Step 3 — Verify

Run the following and confirm all pass:

1. `npm exec nx build opticv-be` — production build must succeed.
2. `npm exec nx test opticv-be` — existing tests must remain green (no new tests required).
3. Start the backend in dev mode (`npm run start-be:dev`) and issue a request:
   ```
   curl -I http://localhost:3000/api
   ```
   Response must include `x-content-type-options: nosniff`.

---

## Files Modified / Created

| File | Action |
|------|--------|
| `package.json` | Modified — `helmet` added to `dependencies` |
| `package-lock.json` | Modified — updated by `npm install` |
| `apps/opticv-be/src/main.ts` | Modified — import + `app.use(helmet())` call added |

---

## Files NOT Changed

- All NestJS modules, services, controllers, guards, filters
- All test files
- All frontend files
- All shared types
- `apps/opticv-be/config/`
- Database schema / migrations
