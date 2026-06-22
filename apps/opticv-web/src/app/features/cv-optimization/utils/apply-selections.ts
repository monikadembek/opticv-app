import type {
  BulletSelectionKey,
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
  removedBullets: BulletSelectionKey[] = [],
  selectedMissingBullets: Array<{
    forPosition: string;
    suggestedBullet: string;
  }> = [],
  missingBulletEdits: Map<string, string> = new Map(),
  keywordEdits: Map<string, string> = new Map(),
  keywordBulletPositions: Map<string, string> = new Map(),
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
        const forPosition = keywordBulletPositions.get(kw);
        if (!forPosition) continue;
        const quotedMatch = entry?.recommendation?.match(/'([^']+)'/);
        const baseText = quotedMatch ? quotedMatch[1] : kw;
        const displayText = keywordEdits.get(kw) ?? baseText;
        const expIndex = clone.experience.findIndex((e) => {
          const dashFormat = `${e.company ?? ''} - ${e.title ?? ''}`;
          const atFormat = `${e.title ?? ''} at ${e.company ?? ''}`;
          return dashFormat === forPosition || atFormat === forPosition;
        });
        if (expIndex !== -1) {
          clone.experience[expIndex].bullets.push(displayText);
        }
      }
    }
  }

  return clone;
}
