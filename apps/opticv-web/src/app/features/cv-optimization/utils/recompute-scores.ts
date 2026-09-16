import type {
  BulletUpgradeResult,
  KeywordGapResult,
  ResumeAutopsyResult,
  UserSelections,
} from '@opticv/datatypes';

export function recomputeKeywordGapResult(
  original: KeywordGapResult,
  selectedKeywords: string[],
  selectedJobTitle = false,
): KeywordGapResult {
  const clone = structuredClone(original);

  if (selectedKeywords.length === 0 && !selectedJobTitle) return clone;

  const selectedSet = new Set<string>(selectedKeywords);

  for (const missing of original.missingKeywords) {
    if (!selectedSet.has(missing.keyword)) continue;
    if (missing.isRequired) {
      clone.matchScoreBreakdown.requiredMatched = Math.min(
        clone.matchScoreBreakdown.requiredMatched + 1,
        clone.matchScoreBreakdown.requiredTotal,
      );
    } else {
      clone.matchScoreBreakdown.preferredMatched = Math.min(
        clone.matchScoreBreakdown.preferredMatched + 1,
        clone.matchScoreBreakdown.preferredTotal,
      );
    }
  }

  if (
    selectedJobTitle &&
    original.jobTitleMatch &&
    original.jobTitleMatch.matchLevel !== 'exact'
  ) {
    clone.matchScoreBreakdown.requiredMatched = Math.min(
      clone.matchScoreBreakdown.requiredMatched + 1,
      clone.matchScoreBreakdown.requiredTotal,
    );
  }

  const { requiredTotal, requiredMatched, preferredTotal, preferredMatched } =
    original.matchScoreBreakdown;

  const reqRatio = requiredTotal > 0 ? requiredMatched / requiredTotal : null;
  const prefRatio =
    preferredTotal > 0 ? preferredMatched / preferredTotal : null;

  let w: number;

  if (reqRatio !== null && prefRatio !== null && reqRatio !== prefRatio) {
    const numerator = original.matchScore / 100 - prefRatio;
    const denominator = reqRatio - prefRatio;
    w =
      Math.abs(denominator) >= 0.001
        ? Math.max(0, Math.min(1, numerator / denominator))
        : 0.7;
  } else if (reqRatio !== null && prefRatio === null) {
    w = 1;
  } else if (reqRatio === null && prefRatio !== null) {
    w = 0;
  } else {
    return clone;
  }

  const newReqRatio =
    clone.matchScoreBreakdown.requiredTotal > 0
      ? clone.matchScoreBreakdown.requiredMatched /
        clone.matchScoreBreakdown.requiredTotal
      : 0;
  const newPrefRatio =
    clone.matchScoreBreakdown.preferredTotal > 0
      ? clone.matchScoreBreakdown.preferredMatched /
        clone.matchScoreBreakdown.preferredTotal
      : 0;

  const rawScore = w * newReqRatio + (1 - w) * newPrefRatio;
  clone.matchScore = Math.max(
    original.matchScore,
    Math.round(rawScore * 100),
  );

  return clone;
}

export function recomputeAtsProjection(
  original: ResumeAutopsyResult,
  selections: UserSelections,
  bulletUpgradeResult: BulletUpgradeResult | null,
  selectedMissingBullets: Array<{ forPosition: string; suggestedBullet: string }>,
): number | null {
  if (
    selections.selectedKeywords.length === 0 &&
    selections.selectedBullets.length === 0 &&
    selectedMissingBullets.length === 0 &&
    selections.selectedSummaryAngle === null
  ) {
    return null;
  }

  let projected = original.overallScore;

  const totalUpgradableBullets = bulletUpgradeResult
    ? bulletUpgradeResult.positions
        .flatMap((p) => p.bullets)
        .filter((b) => b.action === 'rewrite').length
    : 0;

  const acceptedBullets = selections.selectedBullets.length;
  const addedMissingBullets = selectedMissingBullets.length;
  const bulletFraction =
    totalUpgradableBullets > 0
      ? (acceptedBullets + addedMissingBullets) / totalUpgradableBullets
      : 0;
  const summaryFraction = selections.selectedSummaryAngle !== null ? 1 : 0;

  for (const issue of original.issues) {
    const estimatedImpact = Number.isFinite(issue.estimatedImpact)
      ? issue.estimatedImpact
      : 0;
    let credit = 0;
    if (issue.category === 'keywords') {
      credit =
        estimatedImpact * (selections.selectedKeywords.length > 0 ? 1 : 0);
    } else if (issue.category === 'content') {
      credit = estimatedImpact * Math.max(bulletFraction, summaryFraction);
    }
    projected += credit;
  }

  const result = Math.round(
    Math.min(
      original.predictedScoreAfterFixes,
      Math.max(original.overallScore, projected),
    ),
  );

  if (result === original.overallScore) return null;

  return result;
}
