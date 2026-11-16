# Spec Review – Task 135: Implement user menu in avatar

### Summary

- Overall assessment: PASS WITH ISSUES
- The spec covers every explicit requirement of the task: avatar menu replacing the settings shortcut, the three entries, tier display with Upgrade or Manage subscription, and moving Sign out into the menu while removing the header icon button. It follows the template structure and the repo conventions. A few additions go beyond the task wording (analytics events, some edge cases), and the Plan & billing interaction model is not fully unambiguous. None of this blocks implementation.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Unlisted assumptions.** Some decisions are made in the body but are missing from "Assumptions":
   - A missing `subscription` object is treated as an unknown tier, not FREE (Edge Cases).
   - The popup uses `appendTo="body"` (Edge Cases, SSR).
   - Focus returns to the avatar on close (Behavior #3).
2. **Unverified API detail.** Data / API says "`POST` portal session". The HTTP method was not confirmed from the task, and the spec relies on `BillingRedirectService.openPortal()` anyway. Remove the method or verify it.
3. **Test scope hedged.** "`app.spec.ts` if it references the removed button" is conditional. Whether `app.spec.ts` needs changes should be determined during planning.
4. **Extra edge case.** The "Subscription canceled-at-period-end / past-due" bullet describes behavior outside the task. It adds no menu logic ("no extra state"), so it is informational only.

#### Unclear or Ambiguous Sections

- **Behavior #5 / Scope (Plan & billing):** It is not stated whether Plan & billing is a single clickable item (the tier label plus the action text, with the item itself triggering Upgrade or Manage subscription) or a non-interactive label followed by a separate action item. The task says "showing the current tier, with Upgrade or Manage subscription", which allows either reading. The spec says "one action" but does not define the item structure.
- **Unknown tier state:** "Plan & billing item ... its billing action is disabled" does not say what text the item shows (Upgrade? Manage subscription? a generic "Plan & billing"?).
- **Tier label format:** "Free", "Basic", "Pro" is stated as an assumption, but the presentation (inline text vs. tag/badge) is left open ("label/tag").
- **Analytics wording:** "add click events for the other menu entries" does not name the events or properties.
- **Acceptance (DEV):** "avatar has correct ARIA attributes" is not enumerated beyond Behavior #2. This is acceptable but relies on cross-referencing.

#### Invented or Unsupported Requirements

- **PostHog events for Account settings, Plan & billing/Upgrade/Manage subscription.** The task does not mention analytics. Preserving the existing `signout_button_clicked` event is justified as keeping existing behavior, but adding new events is not grounded in the task.
- **Detailed accessibility behavior** (`aria-haspopup`, `aria-controls`, `aria-expanded`, focus return, Escape handling). It is not in the task, but it is supported by the project rules (AXE / WCAG AA) and so is acceptable.
- **Disabling Manage subscription while a redirect is in progress.** This is a defensive behavior not in the task. It is consistent with the existing Settings behavior.
- **Out-of-scope items** (email header in menu, avatar photo, responsive redesign) are fine as exclusions.

### Assumptions Detected

| Assumption | Explicitly stated? |
| --- | --- |
| Tier values are FREE / BASIC / PRO with display names Free / Basic / Pro | Yes |
| Upgrade goes to `/pricing`, not directly to checkout | Yes (confirmed by user during clarification) |
| Manage subscription opens the Stripe portal directly | Yes (confirmed by user) |
| No UI mockup provided; PrimeNG Aura defaults apply | Yes |
| Menu is a PrimeNG popup `p-menu` | Yes (confirmed by user) |
| Loading/failed profile: no tier label, billing action disabled | Yes (confirmed by user) |
| Missing `subscription` object = unknown tier, not FREE | No (only in Edge Cases) |
| `appendTo="body"` is needed for SSR | No |
| Focus returns to the avatar on close | No |
| New analytics events are wanted | No (implicit) |
| Past-due / cancel-at-period-end users show Manage subscription | No (Edge Cases only) |

### Recommendation

- Proceed as-is

Optional minor revision before planning: list the unlisted assumptions, define the Plan & billing item structure (single item vs. label plus action), and either drop or confirm the new analytics events.
