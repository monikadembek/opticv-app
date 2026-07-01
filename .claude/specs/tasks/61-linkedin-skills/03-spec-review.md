# Spec Review: Task 61 — LinkedIn section: skills improvements

Reviewed against: `.claude/specs/tasks/61-linkedin-skills/02-spec.md`
Source task: `.claude/specs/tasks/61-linkedin-skills/00-raw-task.md`

---

## Summary

- **Overall assessment: PASS**
- The specification correctly captures all product decisions from the raw task. Backward
  compatibility with old stored results has been dropped (the one existing DB record will
  be deleted), which simplifies the component, export service, and test surface. All
  requirements are traceable to the task, edge cases are handled, and acceptance criteria
  are clear enough to implement without guessing.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **`linkedin-export.service.spec.ts` is a conditional update.** The spec notes it
   "if it references `skillsToAdd`" — this is correct, but an implementer should grep
   for `skillsToAdd` in that file before starting to avoid a surprise mid-task.

---

### Unclear or Ambiguous Sections

None.

---

### Invented or Unsupported Requirements

None.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|---|---|
| 1 | No backend application code references `skillsToAdd` / `LinkedInRewriteResult` beyond `seed.ts`. | Yes |
| 2 | The one existing stored LinkedIn optimization result will be deleted from the DB before running with the new code. | Yes |
| 3 | Chip color conventions follow existing component styling in `linkedin-updates.html`. | Yes |
| 4 | "Copy all" and per-chip layout follow the existing copy-button pattern; no new PrimeNG components. | Yes |
| 5 | Empty-state wording standardized to "No skills recommended" across UI and both export formats. | Yes |
| 6 | `createdAt` is not refreshed on upsert-update, so explicit `isActive: false` on v2.0.0 is mandatory. | Yes |
| 7 | Array order from the AI encodes ranking; no re-sort in the frontend. | Yes |

---

## Recommendation

**Proceed as-is.**
