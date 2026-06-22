import { describe, expect, it } from 'vitest';
import { applySelectionsToCV } from './apply-selections';
import type {
  BulletSelectionKey,
  BulletUpgradeResult,
  CvStructuredData,
  KeywordGapResult,
  SummaryRewriteResult,
  UserSelections,
} from '@opticv/datatypes';

const BASE_CV: CvStructuredData = {
  contact: { name: 'Test User', email: 'test@example.com', phone: null, location: null, linkedin: null, website: null },
  summary: 'Original summary',
  experience: [
    {
      company: 'Acme Corp',
      title: 'Frontend Developer',
      location: null,
      startDate: '2021-01',
      endDate: '2024-01',
      current: false,
      bullets: [
        'Did things with React.',
        'Worked on backend tasks occasionally.',
        'Led migration of legacy codebase to TypeScript.',
      ],
    },
    {
      company: 'Beta Inc',
      title: 'Engineer',
      location: null,
      startDate: '2019-01',
      endDate: '2021-01',
      current: false,
      bullets: ['Shipped features.'],
    },
  ],
  education: [],
  skills: ['JavaScript', 'HTML'],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
};

const EMPTY_SELECTIONS: UserSelections = {
  selectedSummaryAngle: null,
  customSummaryText: null,
  selectedBullets: [],
  selectedKeywords: [],
};

const BULLET_RESULT: BulletUpgradeResult = {
  positions: [
    {
      company: 'Acme Corp',
      title: 'Frontend Developer',
      dates: '2021–2024',
      bullets: [
        {
          originalText: 'Did things with React.',
          action: 'rewrite',
          weakness: 'Vague',
          rewrittenText: 'Built React dashboards reducing load time by 40%.',
          rewriteRationale: 'Added measurable impact.',
          needsUserInput: false,
          placeholdersToFill: [],
          actionVerb: 'Built',
          keywordsIncorporated: ['React'],
        },
      ],
    },
  ],
  missingBulletSuggestions: [],
  overallNotes: '',
  verbDiversityCheck: { uniqueVerbsUsed: 3, totalBullets: 4, diverseEnough: true },
};

const SUMMARY_RESULT: SummaryRewriteResult = {
  originalSummary: 'Original summary',
  variants: [
    { angle: 'achievement_led', text: 'Achievement-led summary.', wordCount: 3, strategicNote: '', keywordsUsed: [] },
    { angle: 'identity_led', text: 'Identity-led summary.', wordCount: 3, strategicNote: '', keywordsUsed: [] },
  ],
  recommendedVariant: 'achievement_led',
  keywordsIncorporated: [],
};

const BASE_MISSING_KW = {
  category: '',
  importance: 'high' as const,
  candidateLikelyHas: false,
  evidenceFromResume: '',
  recommendation: '',
};

const KEYWORD_RESULT: KeywordGapResult = {
  matchScore: 70,
  matchScoreBreakdown: { requiredMatched: 2, requiredTotal: 5, preferredMatched: 1, preferredTotal: 3 },
  matchedKeywords: [],
  missingKeywords: [
    { ...BASE_MISSING_KW, keyword: 'TypeScript', suggestedPlacement: 'skills', isRequired: true },
    { ...BASE_MISSING_KW, keyword: 'React', suggestedPlacement: 'experience_bullet', isRequired: true },
    { ...BASE_MISSING_KW, keyword: 'CSS', suggestedPlacement: 'multiple', isRequired: false, importance: 'medium' },
  ],
  underweightedKeywords: [],
  fabricationWarnings: [],
  acronymIssues: [],
};

describe('applySelectionsToCV', () => {
  it('returns a clone of the CV when no selections are made', () => {
    const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null);
    expect(result).toEqual(BASE_CV);
    expect(result).not.toBe(BASE_CV);
  });

  describe('summary rewrite', () => {
    it('applies the selected angle variant summary', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedSummaryAngle: 'achievement_led' };
      const result = applySelectionsToCV(BASE_CV, selections, SUMMARY_RESULT, null, null);
      expect(result.summary).toBe('Achievement-led summary.');
    });

    it('applies identity_led variant when that angle is selected', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedSummaryAngle: 'identity_led' };
      const result = applySelectionsToCV(BASE_CV, selections, SUMMARY_RESULT, null, null);
      expect(result.summary).toBe('Identity-led summary.');
    });

    it('applies customSummaryText when provided (overrides angle)', () => {
      const selections: UserSelections = {
        ...EMPTY_SELECTIONS,
        selectedSummaryAngle: 'achievement_led',
        customSummaryText: 'My own summary.',
      };
      const result = applySelectionsToCV(BASE_CV, selections, SUMMARY_RESULT, null, null);
      expect(result.summary).toBe('My own summary.');
    });

    it('does not change summary when selectedSummaryAngle is null', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, SUMMARY_RESULT, null, null);
      expect(result.summary).toBe('Original summary');
    });

    it('does not change summary when summaryResult is null', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedSummaryAngle: 'achievement_led' };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, null);
      expect(result.summary).toBe('Original summary');
    });

    it('does not change summary when angle does not match any variant', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedSummaryAngle: 'mission_led' };
      const result = applySelectionsToCV(BASE_CV, selections, SUMMARY_RESULT, null, null);
      expect(result.summary).toBe('Original summary');
    });
  });

  describe('bullet rewrites', () => {
    const selectedBullet: BulletSelectionKey = {
      company: 'Acme Corp',
      title: 'Frontend Developer',
      originalText: 'Did things with React.',
    };

    it('replaces the original bullet text with the AI rewrittenText', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedBullets: [selectedBullet] };
      const result = applySelectionsToCV(BASE_CV, selections, null, BULLET_RESULT, null);
      const bullets = result.experience[0].bullets;
      expect(bullets).toContain('Built React dashboards reducing load time by 40%.');
      expect(bullets).not.toContain('Did things with React.');
    });

    it('uses bulletEdits override when one is provided for the key', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedBullets: [selectedBullet] };
      const editKey = `${selectedBullet.company}|${selectedBullet.title}|${selectedBullet.originalText}`;
      const bulletEdits = new Map([[editKey, 'Hand-edited bullet.']]);
      const result = applySelectionsToCV(BASE_CV, selections, null, BULLET_RESULT, null, bulletEdits);
      expect(result.experience[0].bullets).toContain('Hand-edited bullet.');
    });

    it('does not change bullets when selectedBullets is empty', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, BULLET_RESULT, null);
      expect(result.experience[0].bullets).toContain('Did things with React.');
    });

    it('does not change bullets when bulletResult is null', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedBullets: [selectedBullet] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, null);
      expect(result.experience[0].bullets).toContain('Did things with React.');
    });

    it('does not affect other positions', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedBullets: [selectedBullet] };
      const result = applySelectionsToCV(BASE_CV, selections, null, BULLET_RESULT, null);
      expect(result.experience[1].bullets).toEqual(['Shipped features.']);
    });
  });

  describe('removed bullets', () => {
    const removedKey: BulletSelectionKey = {
      company: 'Acme Corp',
      title: 'Frontend Developer',
      originalText: 'Worked on backend tasks occasionally.',
    };

    it('removes the specified bullet from the experience entry', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [removedKey]);
      expect(result.experience[0].bullets).not.toContain('Worked on backend tasks occasionally.');
    });

    it('keeps other bullets in the same position intact', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [removedKey]);
      expect(result.experience[0].bullets).toContain('Did things with React.');
      expect(result.experience[0].bullets).toContain('Led migration of legacy codebase to TypeScript.');
    });

    it('does nothing when removedBullets is empty', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), []);
      expect(result.experience[0].bullets.length).toBe(3);
    });

    it('ignores a removed bullet key whose company/title does not match', () => {
      const badKey: BulletSelectionKey = { company: 'Unknown Co', title: 'Unknown Role', originalText: 'Some bullet.' };
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [badKey]);
      expect(result.experience[0].bullets.length).toBe(3);
    });

    it('does not mutate the original CV', () => {
      applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [removedKey]);
      expect(BASE_CV.experience[0].bullets).toContain('Worked on backend tasks occasionally.');
    });
  });

  describe('missing bullet suggestions', () => {
    const suggestion = {
      forPosition: 'Frontend Developer at Acme Corp',
      suggestedBullet: 'Mentored 3 junior developers.',
    };

    it('appends the suggested bullet using dash format matching', () => {
      const suggestionDash = {
        forPosition: 'Acme Corp - Frontend Developer',
        suggestedBullet: 'Mentored 3 junior developers.',
      };
      const result = applySelectionsToCV(
        BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [], [suggestionDash],
      );
      expect(result.experience[0].bullets).toContain('Mentored 3 junior developers.');
    });

    it('appends the suggested bullet using "at" format matching', () => {
      const result = applySelectionsToCV(
        BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [], [suggestion],
      );
      expect(result.experience[0].bullets).toContain('Mentored 3 junior developers.');
    });

    it('uses missingBulletEdits text when an edit is provided', () => {
      const editKey = `${suggestion.forPosition}|${suggestion.suggestedBullet}`;
      const missingBulletEdits = new Map([[editKey, 'Custom mentoring bullet.']]);
      const result = applySelectionsToCV(
        BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [], [suggestion], missingBulletEdits,
      );
      expect(result.experience[0].bullets).toContain('Custom mentoring bullet.');
      expect(result.experience[0].bullets).not.toContain('Mentored 3 junior developers.');
    });

    it('does nothing when forPosition does not match any experience entry', () => {
      const noMatch = { forPosition: 'Nonexistent Role at Unknown Co', suggestedBullet: 'Some bullet.' };
      const result = applySelectionsToCV(
        BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [], [noMatch],
      );
      expect(result.experience[0].bullets.length).toBe(3);
      expect(result.experience[1].bullets.length).toBe(1);
    });

    it('does not mutate the original CV', () => {
      applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, null, new Map(), [], [suggestion]);
      expect(BASE_CV.experience[0].bullets.length).toBe(3);
    });
  });

  describe('keyword selection', () => {
    const selectionsWithKeywords: UserSelections = {
      ...EMPTY_SELECTIONS,
      selectedKeywords: ['TypeScript', 'CSS'],
    };

    it('adds keywords with placement "skills" to the skills array', () => {
      const result = applySelectionsToCV(BASE_CV, selectionsWithKeywords, null, null, KEYWORD_RESULT);
      expect(result.skills).toContain('TypeScript');
    });

    it('adds keywords with placement "multiple" to the skills array', () => {
      const result = applySelectionsToCV(BASE_CV, selectionsWithKeywords, null, null, KEYWORD_RESULT);
      expect(result.skills).toContain('CSS');
    });

    it('does not add keywords with placement "experience_bullet" to skills', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedKeywords: ['React'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, KEYWORD_RESULT);
      expect(result.skills).not.toContain('React');
    });

    describe('experience_bullet placement', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedKeywords: ['React'] };
      const position = 'Acme Corp - Frontend Developer';

      const kwResultWithQuotedRecommendation: KeywordGapResult = {
        ...KEYWORD_RESULT,
        missingKeywords: [
          {
            ...BASE_MISSING_KW,
            keyword: 'React',
            suggestedPlacement: 'experience_bullet',
            isRequired: true,
            recommendation: "Add 'Built performant UIs with React hooks and context API' to your experience.",
          },
        ],
      };

      const kwResultWithUnquotedRecommendation: KeywordGapResult = {
        ...KEYWORD_RESULT,
        missingKeywords: [
          {
            ...BASE_MISSING_KW,
            keyword: 'React',
            suggestedPlacement: 'experience_bullet',
            isRequired: true,
            recommendation: 'Demonstrate React expertise by adding a specific project example.',
          },
        ],
      };

      it('extracts the quoted text from recommendation as the bullet', () => {
        const kwBulletPositions = new Map([['React', position]]);
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), new Map(), kwBulletPositions,
        );
        expect(result.experience[0].bullets).toContain(
          'Built performant UIs with React hooks and context API',
        );
        expect(result.experience[1].bullets).not.toContain(
          'Built performant UIs with React hooks and context API',
        );
      });

      it('falls back to keyword when recommendation has no quoted text', () => {
        const kwBulletPositions = new Map([['React', position]]);
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithUnquotedRecommendation,
          new Map(), [], [], new Map(), new Map(), kwBulletPositions,
        );
        expect(result.experience[0].bullets).toContain('React');
        expect(result.experience[0].bullets).not.toContain(
          'Demonstrate React expertise by adding a specific project example.',
        );
      });

      it('uses keywordEdits override instead of extracted recommendation text', () => {
        const kwBulletPositions = new Map([['React', position]]);
        const kwEdits = new Map([['React', 'Built high-performance React dashboards serving 50k users.']]);
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), kwEdits, kwBulletPositions,
        );
        expect(result.experience[0].bullets).toContain(
          'Built high-performance React dashboards serving 50k users.',
        );
        expect(result.experience[0].bullets).not.toContain(
          'Built performant UIs with React hooks and context API',
        );
      });

      it('does not modify any experience entry when no position is assigned', () => {
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), new Map(), new Map(),
        );
        expect(result.experience[0].bullets).toHaveLength(3);
        expect(result.experience[1].bullets).toHaveLength(1);
      });

      it('does not modify any experience entry when the position label does not match', () => {
        const kwBulletPositions = new Map([['React', 'Nonexistent Corp - CTO']]);
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), new Map(), kwBulletPositions,
        );
        expect(result.experience[0].bullets).toHaveLength(3);
        expect(result.experience[1].bullets).toHaveLength(1);
      });
    });

    it('does not duplicate a keyword already present in skills', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedKeywords: ['JavaScript'] };
      const kwResult: KeywordGapResult = {
        ...KEYWORD_RESULT,
        missingKeywords: [
          { ...BASE_MISSING_KW, keyword: 'JavaScript', suggestedPlacement: 'skills', isRequired: false, importance: 'medium' },
        ],
      };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, kwResult);
      expect(result.skills.filter((s) => s.toLowerCase() === 'javascript').length).toBe(1);
    });

    it('does not add keywords when selectedKeywords is empty', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, KEYWORD_RESULT);
      expect(result.skills).toEqual(BASE_CV.skills);
    });

    it('does not add keywords when keywordResult is null', () => {
      const result = applySelectionsToCV(BASE_CV, selectionsWithKeywords, null, null, null);
      expect(result.skills).toEqual(BASE_CV.skills);
    });
  });

  describe('combined transformations', () => {
    it('applies summary, bullet rewrite, removed bullet, missing bullet, and keyword in one call', () => {
      const selectedBullet: BulletSelectionKey = {
        company: 'Acme Corp',
        title: 'Frontend Developer',
        originalText: 'Did things with React.',
      };
      const removedBullet: BulletSelectionKey = {
        company: 'Acme Corp',
        title: 'Frontend Developer',
        originalText: 'Worked on backend tasks occasionally.',
      };
      const missingBullet = {
        forPosition: 'Frontend Developer at Acme Corp',
        suggestedBullet: 'Mentored juniors.',
      };
      const selections: UserSelections = {
        selectedSummaryAngle: 'achievement_led',
        customSummaryText: null,
        selectedBullets: [selectedBullet],
        selectedKeywords: ['TypeScript'],
      };

      const result = applySelectionsToCV(
        BASE_CV,
        selections,
        SUMMARY_RESULT,
        BULLET_RESULT,
        KEYWORD_RESULT,
        new Map(),
        [removedBullet],
        [missingBullet],
      );

      expect(result.summary).toBe('Achievement-led summary.');
      const acmeBullets = result.experience[0].bullets;
      expect(acmeBullets).toContain('Built React dashboards reducing load time by 40%.');
      expect(acmeBullets).not.toContain('Did things with React.');
      expect(acmeBullets).not.toContain('Worked on backend tasks occasionally.');
      expect(acmeBullets).toContain('Mentored juniors.');
      expect(result.skills).toContain('TypeScript');
    });
  });
});
