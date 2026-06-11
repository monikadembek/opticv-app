import type {
  BulletUpgradeResult,
  CvStructuredData,
  KeywordGapResult,
  SummaryRewriteResult,
  UserSelections,
} from '@opticv/datatypes';

export function applySelectionsToCV(
  cv: CvStructuredData,
  selections: UserSelections,
  summaryResult: SummaryRewriteResult | null,
  bulletResult: BulletUpgradeResult | null,
  keywordResult: KeywordGapResult | null,
  bulletEdits: Map<string, string> = new Map(),
): CvStructuredData {
  const clone: CvStructuredData = structuredClone(cv);

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

  if (selections.selectedKeywords.length > 0 && keywordResult) {
    const existing = new Set(clone.skills.map((s) => s.toLowerCase()));
    for (const kw of selections.selectedKeywords) {
      const entry = keywordResult.missingKeywords.find(
        (m) => m.keyword === kw,
      );
      const placement = entry?.suggestedPlacement;
      if (placement === 'skills' || placement === 'multiple' || !placement) {
        if (!existing.has(kw.toLowerCase())) {
          clone.skills.push(kw);
          existing.add(kw.toLowerCase());
        }
      }
    }
  }

  return clone;
}
