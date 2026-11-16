### Summary

- Overall result: PASS WITH ISSUES
- The implementation covers the spec: unguarded lazy `/pricing` route, three plan cards driven by `TIER_LIMITS`, shared `BillingRedirectService`, Settings reduced to "View plans" / "Manage billing", and updated tier limits and tests. There are no critical rule violations. Open items are one out-of-scope change (header menu entry), a WCAG 2.5.3 label mismatch on some CTAs, and minor duplication and deviations from the plan.
- Scope reviewed: `git diff HEAD~2 HEAD` (both Task 134 commits). Tests were not executed as part of this review.

### Conventions Violations

#### Critical (must fix before merge)

None.

#### Non-Critical (should fix)

1. `apps/opticv-web/src/app/features/pricing/pricing.ts:169-172, 182-185` — The visible label and the accessible name do not match. "Get Basic" / "Get Pro" have `aria-label` "Get the Basic plan" / "Get the Pro plan", and "Get started for free" has `aria-label` "Get started with the Free plan". The visible text is not contained in the accessible name, which fails WCAG 2.5.3 (Label in Name) and can be flagged by AXE. The "Upgrade to …", "Current plan: …" and "Manage billing to switch to …" names do contain their labels.
2. `apps/opticv-web/src/app/layout/top-header/top-header.ts:60-63` — A "Pricing" menu item was added, but only inside `loggedInMenuItems`. Logged-out visitors, who the page is most relevant for, do not see it. The spec (Out of scope, Assumption 4) and the plan ("Not changed") exclude header navigation. This is a scope deviation (see Plan Deviations). No spec in the diff covers the new item.
3. `apps/opticv-web/src/app/features/settings/settings.html:151-155` and `settings.ts:365-367` — "View plans" is a button that calls `router.navigate`. The spec says "link/button" and the plan says `routerLink`. A real link (`routerLink`) gives native link semantics (open in new tab, correct role), which is better for AXE and keyboard use.
4. `apps/opticv-web/src/app/features/pricing/pricing.html:34` — `styleClass="w-full"` on `p-button` is deprecated in PrimeNG 21 in favour of `class`. Verify against the version in use.
5. `apps/opticv-web/src/app/features/pricing/pricing.html:1` — The `pricing-page` class has no matching style (dead class). Also, `<li>` wrapping `<article>` plus `h-full` is redundant with the `<li>` already being the flex card.
6. `apps/opticv-web/src/app/features/pricing/pricing.html:54` — `} @for (...)` is chained on the closing line of the previous `@for` block. Formatting only; run `nx format:check`.
7. `docs/subscription-tier-limits.md` — The LinkedIn FREE row was changed from "0 (not offered)" to "1". This is correct against `TIER_LIMITS` but not part of the planned file list. `docs/tasks-list.md` also changed (not in the plan; likely housekeeping).

### Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| `/pricing` route, lazy, title `Pricing – OptiCV`, no guards | Covered | `app.routes.ts:56-61`; route spec added |
| Render as client route (plan finding 1) | Covered | `app.routes.server.ts:9` |
| Three cards Free/Basic/Pro with name, tagline, price, CTA, features | Covered | Prices/taglines in `pricing.constants.ts`; quotas from `TIER_LIMITS` |
| Quotas derived from `TIER_LIMITS` (not hard-coded) | Covered | `pricing.ts:143-158` |
| Page title and subtitle | Covered | h1 as specified; subtitle per plan |
| Guest CTAs → `/login?returnUrl=/pricing` | Covered | `onCta` `login` action |
| FREE user: Free "Current plan" disabled; Basic/Pro start checkout; loading + disabled while redirecting | Covered | `busy` and `loading` bindings |
| Paid user: own card "Current plan", other paid card "Manage billing", Free card no action | Covered | Free card `cta: null` |
| Paid rule = ACTIVE/TRIALING/PAST_DUE and tier ≠ FREE | Covered | Duplicated from Settings (see Code Smells) |
| Loading/profile-error: CTAs disabled, no logged-out flash | Covered | `viewerState` `loading`/`error` |
| Errors → toast and re-enable buttons | Covered | `BillingRedirectService` |
| Double click ignored while redirecting | Covered | Guards in `startCheckout`/`openPortal` |
| SSR safe (redirect via `DOCUMENT.defaultView`) | Covered | `redirectTo` |
| Settings: upgrade buttons and `onUpgrade` removed, "View plans" for FREE | Covered | Navigates via button, not link |
| Settings: Manage billing, badges, usage, billing toasts unchanged | Covered | `ngOnInit` unchanged |
| `TIER_LIMITS` stored CVs 1/5/10, Free templates unchanged | Covered | `datatypes.ts` |
| Backend/spec updates for old limits | Covered | `cv.service.spec.ts`, `users.service.spec.ts` changed |
| Tests: pricing states, Settings, route unguarded, billing service | Covered | Spec files present for each |
| Analytics `pricing_cta_clicked` | Covered (dropped) | Spec marks it optional; the plan dropped it |
| WCAG AA / AXE | Partial | Label-in-name mismatch (Non-Critical 1); not verified with an AXE run |
| No header/footer navigation change | Partial | Header "Pricing" item added (Non-Critical 2) |

### Plan Deviations

- `top-header.ts` was modified (Pricing menu item); the plan lists header navigation under "Not changed".
- Settings "View plans" uses `Router.navigate` via a click handler instead of `routerLink` (plan step 4). The plan allowed either ("`routerLink` … or `Router.navigate`" in the bullet above it), so this is minor.
- `docs/subscription-tier-limits.md` and `docs/tasks-list.md` were modified and are not in the plan's file list.
- The plan allowed `app.routes.spec.ts` only if no suitable spec exists; it was created, which is consistent.

### Null Safety Issues

None blocking.

- `billing-redirect.service.ts:76` — `(err as { error?: { message?: string } })?.error?.message` is a type assertion on `unknown`. It is guarded with `?.`, so it is safe, but it duplicates the same pattern used elsewhere in `settings.ts`.
- `pricing.ts:105` — `plan.cta?.action` is correctly guarded for the Free card where `cta` is `null`.

### Code Smells

1. Duplication: the paid-status rule (`['ACTIVE', 'TRIALING', 'PAST_DUE']` and `tier !== 'FREE'`) lives in both `pricing.ts:42,86-91` and `settings.ts:145-152` (`hasActivePaidSubscription`). The spec wants the same rule on both pages, so this should be a single shared helper. `PAID_STATUSES` is also an untyped `string[]` rather than typed against the subscription status type.
2. Duplication: the error-message extraction is repeated in `settings.ts` (several handlers) and now `billing-redirect.service.ts`.
3. `pricing.ts:160-229` — `ctaButtonFor` repeats near-identical CTA objects (loading/error vs guest, and label/ariaLabel strings). This could be a small lookup, which would also make the label/aria fix in Non-Critical 1 a one-place change.
4. `pricing.ts:131-140` — `toPlanCard` recomputes `viewerState()` and `subscription()` for each plan. This is a minor inefficiency inside a `computed`.
5. Magic strings: ARIA/label wording and `'/pricing'` appear inline. The `'/pricing'` literal is used in `pricing.ts:108` and `settings.ts:366`. A shared route constant would help (the repo already has a shared constants file for the landing-page link).
6. `pricing.ts:119-120` — `default: break;` is redundant with the `none` case.

### Recommendation

- Merge as-is
- **Fix critical issues before merge** — no critical issues; address Non-Critical 1 (label-in-name) and 2 (header item: remove or get PO approval) before merge, since they affect the AXE/WCAG acceptance criterion and scope.
- Significant rework required
