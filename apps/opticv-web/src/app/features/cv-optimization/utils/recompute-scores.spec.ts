import { describe, expect, it } from 'vitest';
import {
  recomputeAtsProjection,
  recomputeKeywordGapResult,
} from './recompute-scores';
import type {
  BulletUpgradeResult,
  KeywordGapResult,
  ResumeAutopsyResult,
  UserSelections,
} from '@opticv/datatypes';

function makeKeywordGapResult(
  overrides: Partial<KeywordGapResult> = {},
): KeywordGapResult {
  return {
    matchScore: 60,
    matchScoreBreakdown: {
      requiredMatched: 3,
      requiredTotal: 5,
      preferredMatched: 2,
      preferredTotal: 4,
    },
    matchedKeywords: [],
    missingKeywords: [
      {
        keyword: 'TypeScript',
        category: 'languages',
        importance: 'critical',
        isRequired: true,
        candidateLikelyHas: true,
        evidenceFromResume: '',
        recommendation: '',
        suggestedPlacement: 'skills',
      },
      {
        keyword: 'Docker',
        category: 'tools',
        importance: 'medium',
        isRequired: false,
        candidateLikelyHas: false,
        evidenceFromResume: '',
        recommendation: '',
        suggestedPlacement: 'skills',
      },
    ],
    underweightedKeywords: [],
    fabricationWarnings: [],
    acronymIssues: [],
    ...overrides,
  };
}

function makeAutopsyResult(
  overrides: Partial<ResumeAutopsyResult> = {},
): ResumeAutopsyResult {
  return {
    overallScore: 50,
    predictedScoreAfterFixes: 80,
    topPriority: 'Add more keywords',
    issues: [
      {
        id: 'kw-1',
        category: 'keywords',
        severity: 'high',
        title: 'Missing keywords',
        quotedText: '',
        location: '',
        whyItMatters: '',
        fix: '',
        estimatedImpact: 10,
      },
      {
        id: 'ct-1',
        category: 'content',
        severity: 'medium',
        title: 'Weak bullets',
        quotedText: '',
        location: '',
        whyItMatters: '',
        fix: '',
        estimatedImpact: 8,
      },
    ],
    strengths: [],
    summary: '',
    ...overrides,
  };
}

function makeSelections(overrides: Partial<UserSelections> = {}): UserSelections {
  return {
    selectedSummaryAngle: null,
    customSummaryText: null,
    selectedBullets: [],
    selectedKeywords: [],
    ...overrides,
  };
}

function makeBulletUpgradeResult(rewriteCount: number): BulletUpgradeResult {
  const bullets = Array.from({ length: rewriteCount }, (_, i) => ({
    originalText: `Bullet ${i}`,
    action: 'rewrite' as const,
    weakness: '',
    rewrittenText: `Rewritten ${i}`,
    rewriteRationale: '',
    needsUserInput: false,
    placeholdersToFill: [],
    actionVerb: 'Led',
    keywordsIncorporated: [],
  }));
  return {
    positions: [{ company: 'Acme', title: 'Dev', bullets }],
    missingBulletSuggestions: [],
    overallNotes: '',
    verbDiversityCheck: { uniqueVerbsUsed: 1, totalBullets: rewriteCount, diverseEnough: true },
  };
}

// ─── recomputeKeywordGapResult ────────────────────────────────────────────────

describe('recomputeKeywordGapResult', () => {
  it('1: no selections → score unchanged', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, []);
    expect(result.matchScore).toBe(original.matchScore);
  });

  it('2: one required keyword selected → requiredMatched increments', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, ['TypeScript']);
    expect(result.matchScoreBreakdown.requiredMatched).toBe(
      original.matchScoreBreakdown.requiredMatched + 1,
    );
  });

  it('3: one preferred keyword selected → preferredMatched increments', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, ['Docker']);
    expect(result.matchScoreBreakdown.preferredMatched).toBe(
      original.matchScoreBreakdown.preferredMatched + 1,
    );
  });

  it('4: score never below original', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, ['TypeScript', 'Docker']);
    expect(result.matchScore).toBeGreaterThanOrEqual(original.matchScore);
  });

  it('5: requiredMatched clamps at requiredTotal', () => {
    const original = makeKeywordGapResult({
      matchScoreBreakdown: {
        requiredMatched: 4,
        requiredTotal: 5,
        preferredMatched: 2,
        preferredTotal: 4,
      },
      missingKeywords: [
        {
          keyword: 'TypeScript',
          category: 'languages',
          importance: 'critical',
          isRequired: true,
          candidateLikelyHas: true,
          evidenceFromResume: '',
          recommendation: '',
          suggestedPlacement: 'skills',
        },
        {
          keyword: 'Java',
          category: 'languages',
          importance: 'high',
          isRequired: true,
          candidateLikelyHas: false,
          evidenceFromResume: '',
          recommendation: '',
          suggestedPlacement: 'skills',
        },
      ],
    });
    const result = recomputeKeywordGapResult(original, ['TypeScript', 'Java']);
    expect(result.matchScoreBreakdown.requiredMatched).toBe(5);
  });

  it('6: back-solved w reproduces original matchScore at zero selections', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, []);
    expect(result.matchScore).toBe(original.matchScore);
  });

  it('7: both totals zero → score unchanged', () => {
    const original = makeKeywordGapResult({
      matchScoreBreakdown: {
        requiredMatched: 0,
        requiredTotal: 0,
        preferredMatched: 0,
        preferredTotal: 0,
      },
    });
    const result = recomputeKeywordGapResult(original, ['TypeScript']);
    expect(result.matchScore).toBe(original.matchScore);
  });

  it('8: keyword not in missingKeywords → no effect on breakdown', () => {
    const original = makeKeywordGapResult();
    const result = recomputeKeywordGapResult(original, ['nonexistent']);
    expect(result.matchScoreBreakdown.requiredMatched).toBe(
      original.matchScoreBreakdown.requiredMatched,
    );
    expect(result.matchScoreBreakdown.preferredMatched).toBe(
      original.matchScoreBreakdown.preferredMatched,
    );
  });
});

// ─── recomputeAtsProjection ───────────────────────────────────────────────────

describe('recomputeAtsProjection', () => {
  it('1: all selections empty → returns null', () => {
    const result = recomputeAtsProjection(
      makeAutopsyResult(),
      makeSelections(),
      null,
      [],
    );
    expect(result).toBeNull();
  });

  it('2: keyword issue credited when keywords selected', () => {
    const autopsy = makeAutopsyResult({ issues: [{ id: 'kw-1', category: 'keywords', severity: 'high', title: 'Missing keywords', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 5 }] });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedKeywords: ['TypeScript'] }),
      null,
      [],
    );
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(autopsy.overallScore);
  });

  it('3: keyword issue not credited when no keywords selected', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [{ id: 'kw-1', category: 'keywords', severity: 'high', title: 'K', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 }],
    });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedSummaryAngle: 'achievement_led' }),
      null,
      [],
    );
    // no keyword credit — only summary selected but no content issues
    expect(result).toBeNull();
  });

  it('4: content issue credited by bullet fraction (1 of 2 bullets accepted)', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [{ id: 'ct-1', category: 'content', severity: 'medium', title: 'C', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 20 }],
    });
    const bulletResult = makeBulletUpgradeResult(2);
    const selections = makeSelections({
      selectedBullets: [{ company: 'Acme', title: 'Dev', originalText: 'Bullet 0' }],
    });
    const result = recomputeAtsProjection(autopsy, selections, bulletResult, []);
    // projected = 50 + 20 * (1/2) = 60
    expect(result).toBe(60);
  });

  it('5: content issue credited by summary fraction when summary selected and no bullets', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [{ id: 'ct-1', category: 'content', severity: 'medium', title: 'C', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 20 }],
    });
    const bulletResult = makeBulletUpgradeResult(2);
    const selections = makeSelections({ selectedSummaryAngle: 'achievement_led' });
    const result = recomputeAtsProjection(autopsy, selections, bulletResult, []);
    // projected = 50 + 20 * max(0, 1) = 70
    expect(result).toBe(70);
  });

  it('6: result clamped to predictedScoreAfterFixes', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 55,
      issues: [{ id: 'kw-1', category: 'keywords', severity: 'critical', title: 'K', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 100 }],
    });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedKeywords: ['TypeScript'] }),
      null,
      [],
    );
    expect(result).toBe(55);
  });

  it('7: result clamped to overallScore from below', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [],
    });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedKeywords: ['TypeScript'] }),
      null,
      [],
    );
    // no issues → projected stays at 50 → equals overallScore → null
    expect(result).toBeNull();
  });

  it('8: non-credited categories (parsing, formatting, structure, length, contact) produce no credit', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [
        { id: 'p-1', category: 'parsing', severity: 'low', title: 'P', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 },
        { id: 'f-1', category: 'formatting', severity: 'low', title: 'F', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 },
        { id: 's-1', category: 'structure', severity: 'low', title: 'S', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 },
        { id: 'l-1', category: 'length', severity: 'low', title: 'L', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 },
        { id: 'c-1', category: 'contact', severity: 'low', title: 'C', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 },
      ],
    });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedKeywords: ['TypeScript'] }),
      null,
      [],
    );
    expect(result).toBeNull();
  });

  it('9: projection equals overallScore after computation → returns null', () => {
    const autopsy = makeAutopsyResult({
      overallScore: 50,
      predictedScoreAfterFixes: 80,
      issues: [{ id: 'p-1', category: 'parsing', severity: 'low', title: 'P', quotedText: '', location: '', whyItMatters: '', fix: '', estimatedImpact: 10 }],
    });
    const result = recomputeAtsProjection(
      autopsy,
      makeSelections({ selectedKeywords: ['TypeScript'] }),
      null,
      [],
    );
    expect(result).toBeNull();
  });
});
