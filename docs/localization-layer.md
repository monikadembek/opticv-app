# Adding Polish Language Support to OptiCV

## Context

The app currently has no i18n infrastructure. All UI text is hardcoded in English across ~40+ Angular templates and multiple TypeScript component files. The backend also returns English-only error messages. Adding Polish as a second language requires building the full localization layer from scratch.

This is a **medium-to-large effort** — roughly 3–5 days of focused work.

---

## Current State

- No i18n library installed (no `@angular/localize`, `transloco`, `ngx-translate`)
- All strings hardcoded in templates and `.ts` files
- No language switcher UI
- No user language preference stored in the database
- PrimeNG locale not configured (affects date/number formatting)
- Backend error messages are English strings scattered across service files

---

## Implementation Steps

### Step 1 — Choose and install an i18n library (Frontend)

**Recommended: `@jsverse/transloco`** (formerly `ngneat/transloco`)
- Works seamlessly with Angular standalone components (no NgModule needed)
- Lazy-loads translation files per language (good for SSR)
- Active maintenance, good Angular 21 compatibility
- Simpler DX than `@angular/localize` (no build-time compilation step)

Alternatives: `@angular/localize` (native, but requires build recompilation per locale), `ngx-translate` (older, less SSR-friendly).

### Step 2 — Create translation files

Create JSON files for each language under `apps/opticv-web/src/assets/i18n/`:

```
assets/i18n/
  en.json   ← extract all current English strings
  pl.json   ← Polish translations
```

All keys should be namespaced by feature, e.g.:
```json
{
  "auth": {
    "login": {
      "title": "Sign in to the app",
      "emailLabel": "Email address",
      ...
    }
  },
  "upload": { ... },
  "cvOptimization": { ... },
  "common": { ... }
}
```

Files to extract strings from (all under `apps/opticv-web/src/app/`):
- `core/auth/pages/login/login.html` + `login.ts`
- `core/auth/pages/verify/verify.html`
- `features/home/home.html`
- `features/upload-cv/upload-cv.html` + `upload-cv.ts`
- `features/cv-optimization/cv-optimization.html`
- `shared/components/top-header/top-header.ts` (menu labels)

### Step 3 — Configure Transloco in the app

- Add `provideTransloco(...)` to `apps/opticv-web/src/app/app.config.ts`
- Set default language to `'en'`, available languages `['en', 'pl']`
- Configure `TranslocoHttpLoader` to load from `/assets/i18n/{lang}.json`

### Step 4 — Replace hardcoded strings in templates and components

For each template: replace hardcoded text with `{{ 'key' | transloco }}` pipe or `translocoService.translate('key')` in TypeScript.

For toast/error messages in `.ts` files (e.g., `upload-cv.ts`, `login.ts`): inject `TranslocoService` and call `.translate()`.

### Step 5 — Add language switcher UI

Add a language toggle (EN / PL) to the top header (`shared/components/top-header/`):
- A simple button or dropdown using PrimeNG `Select` or `Button`
- On click: call `translocoService.setActiveLang('pl')` and persist the choice (localStorage or user preference via API)

### Step 6 — Persist language preference (optional but recommended)

**Option A (simple):** Store in `localStorage` — stateless, no backend changes needed.

**Option B (full):** Store in the database — requires:
- Add `preferredLanguage String @default("en")` field to the `User` model in `apps/opticv-be/prisma/schema.prisma`
- Run a Prisma migration
- Add a PATCH `/api/users/me/preferences` endpoint in the backend
- Frontend calls this endpoint on language switch and reads it on login

Option A is sufficient for an MVP.

### Step 7 — Configure PrimeNG locale

PrimeNG date pickers, calendars, and number inputs use a global locale. In `app.config.ts`:
```ts
import { providePrimeNG } from 'primeng/config';
import pl from '@angular/common/locales/pl'; // if using @angular/localize
```
Or use Transloco's active language to drive PrimeNG's `PrimeNGConfig.setTranslation()` with Polish locale strings.

### Step 8 — Localize backend error messages (lower priority)

The backend returns ~8 English error strings from services (CV, job applications, throttling). These surface in the frontend as toast notifications.

Options:
- **Frontend-owned (recommended for MVP):** Map known error codes/types on the frontend and show translated messages there. Backend returns structured error codes, frontend translates.
- **Backend-owned:** Install `nestjs-i18n`, create translation files for `en` and `pl`, translate error strings server-side based on `Accept-Language` header.

Frontend-owned mapping is simpler and keeps backend changes minimal.

---

## Effort Estimate

| Area | Effort |
|---|---|
| Library setup + app config | 2–3 hours |
| Extracting strings to JSON files (en + pl) | 4–6 hours |
| Replacing strings in all templates/components | 4–8 hours |
| Language switcher UI + localStorage persistence | 2–3 hours |
| PrimeNG locale config | 1 hour |
| Backend error localization (optional) | 4–8 hours |
| **Total (MVP without backend)** | **~13–20 hours** |
| **Total (full, with backend)** | **~18–28 hours** |

---

## Verification

1. Run `npm exec nx serve opticv-web` — app loads in English by default
2. Switch to Polish via the language toggle — all UI text changes to Polish
3. Refresh page — language persists (localStorage)
4. Log in and use the upload/optimization flow — all toast messages appear in the selected language
5. Check PrimeNG date/number components render in correct locale format
