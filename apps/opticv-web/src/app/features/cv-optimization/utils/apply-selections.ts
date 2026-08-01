import type {
  BulletSelectionKey,
  BulletUpgradeResult,
  CvStructuredData,
  KeywordGapResult,
  SummaryRewriteResult,
  UserSelections,
} from '@opticv/datatypes';
import { DEFAULT_GDPR_CLAUSE } from '../cv-templates';

function replaceFirstCaseInsensitive(
  text: string,
  term: string,
  replacement: string,
): string | null {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return null;
  return text.slice(0, index) + replacement + text.slice(index + term.length);
}

export function applySelectionsToCV(
  cv: CvStructuredData,
  selections: UserSelections,
  summaryResult: SummaryRewriteResult | null,
  bulletResult: BulletUpgradeResult | null,
  keywordResult: KeywordGapResult | null,
  bulletEdits: Map<string, string> = new Map(),
  removedBullets: BulletSelectionKey[] = [],
  selectedMissingBullets: Array<{
    forPosition: string;
    suggestedBullet: string;
  }> = [],
  missingBulletEdits: Map<string, string> = new Map(),
  keywordEdits: Map<string, string> = new Map(),
  keywordBulletPositions: Map<string, number> = new Map(),
  acronymEdits: Map<string, string> = new Map(),
  acronymBulletPositions: Map<string, number> = new Map(),
  includeGdprClause = false,
  originalGdprClause: string | null = null,
): CvStructuredData {
  const clone: CvStructuredData = structuredClone(cv);

  for (const key of removedBullets) {
    const expIndex = clone.experience.findIndex(
      (e) => e.company === key.company && e.title === key.title,
    );
    if (expIndex === -1) continue;
    clone.experience[expIndex].bullets = clone.experience[
      expIndex
    ].bullets.filter((b) => b.trim() !== key.originalText.trim());
  }

  if (selections.selectedSummaryAngle && summaryResult) {
    if (selections.customSummaryText !== null) {
      clone.summary = selections.customSummaryText;
    } else {
      const variant = summaryResult.variants.find(
        (v) => v.angle === selections.selectedSummaryAngle,
      );
      if (variant) {
        clone.summary = variant.text;
      }
    }
  }

  if (selections.selectedBullets.length > 0 && bulletResult) {
    for (const key of selections.selectedBullets) {
      const position = bulletResult.positions.find(
        (p) => p.company === key.company && p.title === key.title,
      );
      if (!position) continue;
      const bulletItem = position.bullets.find(
        (b) => b.originalText.trim() === key.originalText.trim(),
      );
      if (!bulletItem?.rewrittenText) continue;

      const expIndex = clone.experience.findIndex(
        (e) => e.company === key.company && e.title === key.title,
      );
      if (expIndex === -1) continue;

      const bulletIndex = clone.experience[expIndex].bullets.findIndex(
        (b) => b.trim() === key.originalText.trim(),
      );
      if (bulletIndex !== -1) {
        const editKey = `${key.company}|${key.title}|${key.originalText}`;
        clone.experience[expIndex].bullets[bulletIndex] =
          bulletEdits.get(editKey) ?? bulletItem.rewrittenText;
      }
    }
  }

  for (const entry of selectedMissingBullets) {
    const missingKey = `${entry.forPosition}|${entry.suggestedBullet}`;
    const text = missingBulletEdits.get(missingKey) ?? entry.suggestedBullet;
    const expIndex = clone.experience.findIndex((e) => {
      const dashFormat = `${e.company ?? ''} - ${e.title ?? ''}`;
      const atFormat = `${e.title ?? ''} at ${e.company ?? ''}`;
      return dashFormat === entry.forPosition || atFormat === entry.forPosition;
    });
    if (expIndex === -1) continue;
    clone.experience[expIndex].bullets.push(text);
  }

  if (selections.selectedKeywords.length > 0 && keywordResult) {
    const existing = new Set(clone.skills.map((s) => s.toLowerCase()));
    for (const kw of selections.selectedKeywords) {
      const entry = keywordResult.missingKeywords.find((m) => m.keyword === kw);
      const placement = entry?.suggestedPlacement;
      if (placement === 'skills' || placement === 'multiple' || !placement) {
        const displayText = keywordEdits.get(kw) ?? kw;
        if (!existing.has(displayText.toLowerCase())) {
          clone.skills.push(displayText);
          existing.add(displayText.toLowerCase());
        }
      } else if (placement === 'experience_bullet') {
        const experienceIndex = keywordBulletPositions.get(kw);
        if (experienceIndex === undefined) continue;
        if (experienceIndex < 0 || experienceIndex >= clone.experience.length)
          continue;
        const quotedMatch = entry?.recommendation?.match(/'([^']+)'/);
        const baseText = quotedMatch ? quotedMatch[1] : kw;
        const displayText = keywordEdits.get(kw) ?? baseText;
        clone.experience[experienceIndex].bullets.push(displayText);
      }
    }
  }

  if (selections.selectedAcronymIssues.length > 0 && keywordResult) {
    for (const term of selections.selectedAcronymIssues) {
      const entry = keywordResult.acronymIssues.find((a) => a.term === term);
      if (!entry?.actionType) continue;

      const displayText = acronymEdits.get(term) ?? entry.fix;
      const placement = entry.suggestedPlacement;

      if (placement === 'skills') {
        const skillIndex = clone.skills.findIndex((s) =>
          s.toLowerCase().includes(entry.term.toLowerCase()),
        );
        if (skillIndex !== -1) {
          const replaced = replaceFirstCaseInsensitive(
            clone.skills[skillIndex],
            entry.term,
            displayText,
          );
          clone.skills[skillIndex] = replaced ?? displayText;
        }
      } else if (placement === 'experience_bullet') {
        const experienceIndex = acronymBulletPositions.get(term);
        if (experienceIndex === undefined) continue;
        if (experienceIndex < 0 || experienceIndex >= clone.experience.length)
          continue;
        const bullets = clone.experience[experienceIndex].bullets;
        const bulletIndex = bullets.findIndex((b) =>
          b.toLowerCase().includes(entry.term.toLowerCase()),
        );
        if (bulletIndex !== -1) {
          const replaced = replaceFirstCaseInsensitive(
            bullets[bulletIndex],
            entry.term,
            displayText,
          );
          if (replaced !== null) bullets[bulletIndex] = replaced;
        }
      } else if (placement === 'summary') {
        if (clone.summary) {
          const replaced = replaceFirstCaseInsensitive(
            clone.summary,
            entry.term,
            displayText,
          );
          if (replaced !== null) clone.summary = replaced;
        }
      } else {
        // 'multiple' and 'title' (no dedicated CV-level title field) — broad replace
        if (clone.summary) {
          const replacedSummary = replaceFirstCaseInsensitive(
            clone.summary,
            entry.term,
            displayText,
          );
          if (replacedSummary !== null) clone.summary = replacedSummary;
        }
        for (let i = 0; i < clone.skills.length; i++) {
          const replacedSkill = replaceFirstCaseInsensitive(
            clone.skills[i],
            entry.term,
            displayText,
          );
          if (replacedSkill !== null) clone.skills[i] = replacedSkill;
        }
        for (const exp of clone.experience) {
          for (let i = 0; i < exp.bullets.length; i++) {
            const replacedBullet = replaceFirstCaseInsensitive(
              exp.bullets[i],
              entry.term,
              displayText,
            );
            if (replacedBullet !== null) exp.bullets[i] = replacedBullet;
          }
        }
      }
    }
  }

  clone.gdprClause = !includeGdprClause
    ? null
    : (originalGdprClause ?? DEFAULT_GDPR_CLAUSE);

  return clone;
}
