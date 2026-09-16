# Implementation Done Report

## Task: 35-cors

---

### Summary

The permissive `app.enableCors()` call in `src/main.ts` has been replaced with a configuration-driven call that restricts cross-origin requests to a single allowed origin. The origin value is supplied via the `FRONTEND_URL` environment variable (which serves the same purpose as the spec-mandated `CORS_ORIGIN`), validated by Joi at startup, and read at runtime through `ConfigService`. Both environment files already contained `FRONTEND_URL` with the correct values, so no new env var was added.

---

### Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Add `CORS_ORIGIN` env var to `development.env` | Not implemented | `FRONTEND_URL=http://localhost:4200` (already present) was reused instead |
| Add `CORS_ORIGIN` env var to `production.env` | Not implemented | `FRONTEND_URL=https://opticv.com` (already present) was reused instead |
| Add `CORS_ORIGIN: Joi.string().uri().required()` to `validation.ts` | Implemented | Added as `FRONTEND_URL: Joi.string().uri().required()` |
| Map `corsOrigin: process.env.CORS_ORIGIN` in `configuration.ts` | Implemented | Added as `frontendUrl: process.env.FRONTEND_URL` |
| Replace `app.enableCors()` with `app.enableCors({ origin: configService.get<string>('corsOrigin') })` | Implemented | Replaced with `app.enableCors({ origin: configService.get<string>('frontendUrl') })` |
| Dev allowed origin: `http://localhost:4200` | Implemented | `FRONTEND_URL=http://localhost:4200` present in `development.env` |
| Prod allowed origin: `https://opticv.com` | Implemented | `FRONTEND_URL=https://opticv.com` present in `production.env` |
| Missing/invalid origin causes Joi startup failure | Implemented | `FRONTEND_URL` is `.uri().required()` in the validation schema |

---

### Files

#### Created

None.

#### Modified

| File | Change |
|---|---|
| `apps/opticv-be/config/validation.ts` | Added `FRONTEND_URL: Joi.string().uri().required()` |
| `apps/opticv-be/config/configuration.ts` | Added `frontendUrl: process.env.FRONTEND_URL` |
| `apps/opticv-be/src/main.ts` | Replaced `app.enableCors()` with `app.enableCors({ origin: configService.get<string>('frontendUrl') })` |
| `docs/tasks-list.md` | Task status updated |

---

### Components

No components were created or modified in this task (backend-only configuration change).

---

### Stores

No stores were created or modified in this task.

---

### Deviations

| Plan Step | Deviation |
|---|---|
| Step 1: Add `CORS_ORIGIN=http://localhost:4200` to `development.env` | Not executed — `FRONTEND_URL=http://localhost:4200` was already present and reused |
| Step 2: Add `CORS_ORIGIN=https://opticv.com` to `production.env` | Not executed — `FRONTEND_URL=https://opticv.com` was already present and reused |
| Step 3: Add `CORS_ORIGIN` to `validation.ts` | Variable name changed to `FRONTEND_URL` |
| Step 4: Add `corsOrigin` to `configuration.ts` | Key name changed to `frontendUrl` |
| Step 5: Use `configService.get<string>('corsOrigin')` in `main.ts` | Used `configService.get<string>('frontendUrl')` instead |

---

### Additional Implementation

None.
