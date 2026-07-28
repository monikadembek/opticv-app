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
  selectedAcronymIssues: [],
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

const ACRONYM_RESULT: KeywordGapResult = {
  ...KEYWORD_RESULT,
  missingKeywords: [],
  acronymIssues: [
    { term: 'JS', issue: 'Should be spelled out.', fix: 'JavaScript', actionType: 'add', suggestedPlacement: 'skills' },
    { term: 'ML', issue: 'Inconsistent with JD.', fix: 'Machine Learning', actionType: 'replace', suggestedPlacement: 'skills' },
  ],
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
      const position = 0;

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

      it('does not modify any experience entry when the position index is missing from the map', () => {
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), new Map(), new Map(),
        );
        expect(result.experience[0].bullets).toHaveLength(3);
        expect(result.experience[1].bullets).toHaveLength(1);
      });

      it('does not modify any experience entry when the position index is out of bounds', () => {
        const kwBulletPositions = new Map([['React', 99]]);
        const result = applySelectionsToCV(
          BASE_CV, selections, null, null, kwResultWithQuotedRecommendation,
          new Map(), [], [], new Map(), new Map(), kwBulletPositions,
        );
        expect(result.experience[0].bullets).toHaveLength(3);
        expect(result.experience[1].bullets).toHaveLength(1);
      });

      it('does not modify any experience entry when the position index is negative', () => {
        const kwBulletPositions = new Map([['React', -1]]);
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
        selectedAcronymIssues: [],
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

  describe('acronym issues', () => {
    it('adds an "add" acronym fix with placement "skills" to skills', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['JS'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, ACRONYM_RESULT);
      expect(result.skills).toContain('JavaScript');
    });

    it('adds an "add" acronym fix with placement "experience_bullet" at the chosen position', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'CI', issue: 'Spell out.', fix: 'Continuous Integration', actionType: 'add', suggestedPlacement: 'experience_bullet' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['CI'] };
      const acronymBulletPositions = new Map([['CI', 0]]);
      const result = applySelectionsToCV(
        BASE_CV, selections, null, null, kwResult,
        new Map(), [], [], new Map(), new Map(), new Map(), new Map(), acronymBulletPositions,
      );
      expect(result.experience[0].bullets).toContain('Continuous Integration');
    });

    it('adds an "add" acronym fix with placement "multiple" to skills (fallback)', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'QA', issue: 'Spell out.', fix: 'Quality Assurance', actionType: 'add', suggestedPlacement: 'multiple' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['QA'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, kwResult);
      expect(result.skills).toContain('Quality Assurance');
    });

    it('replaces a matching skill entry for "replace" with placement "skills"', () => {
      const cv: CvStructuredData = { ...BASE_CV, skills: ['ML', 'HTML'] };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['ML'] };
      const result = applySelectionsToCV(cv, selections, null, null, ACRONYM_RESULT);
      expect(result.skills).toContain('Machine Learning');
      expect(result.skills).not.toContain('ML');
    });

    it('replaces the substring in the chosen bullet for "replace" with placement "experience_bullet"', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'React', issue: 'x', fix: 'React.js', actionType: 'replace', suggestedPlacement: 'experience_bullet' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['React'] };
      const acronymBulletPositions = new Map([['React', 0]]);
      const result = applySelectionsToCV(
        BASE_CV, selections, null, null, kwResult,
        new Map(), [], [], new Map(), new Map(), new Map(), new Map(), acronymBulletPositions,
      );
      expect(result.experience[0].bullets).toContain('Did things with React.js.');
    });

    it('replaces the substring in summary for "replace" with placement "summary"', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'Original', issue: 'x', fix: 'Updated', actionType: 'replace', suggestedPlacement: 'summary' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['Original'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, kwResult);
      expect(result.summary).toBe('Updated summary');
    });

    it('replaces across summary, skills, and bullets independently for placement "multiple"', () => {
      const cv: CvStructuredData = {
        ...BASE_CV,
        summary: 'Expert in AWS.',
        skills: ['AWS', 'HTML'],
        experience: [
          { ...BASE_CV.experience[0], bullets: ['Used AWS extensively.'] },
          BASE_CV.experience[1],
        ],
      };
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'AWS', issue: 'x', fix: 'Amazon Web Services', actionType: 'replace', suggestedPlacement: 'multiple' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['AWS'] };
      const result = applySelectionsToCV(cv, selections, null, null, kwResult);
      expect(result.summary).toBe('Expert in Amazon Web Services.');
      expect(result.skills).toContain('Amazon Web Services');
      expect(result.experience[0].bullets).toContain('Used Amazon Web Services extensively.');
    });

    it('treats placement "title" the same as "multiple"', () => {
      const cv: CvStructuredData = { ...BASE_CV, summary: 'Expert in DBA.' };
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'DBA', issue: 'x', fix: 'Database Administrator', actionType: 'replace', suggestedPlacement: 'title' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['DBA'] };
      const result = applySelectionsToCV(cv, selections, null, null, kwResult);
      expect(result.summary).toBe('Expert in Database Administrator.');
    });

    it('leaves the CV unchanged when "replace" term is not found', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'NOTFOUND', issue: 'x', fix: 'Something Else', actionType: 'replace', suggestedPlacement: 'summary' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['NOTFOUND'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, kwResult);
      expect(result.summary).toBe('Original summary');
    });

    it('uses acronymEdits override instead of entry.fix', () => {
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['JS'] };
      const acronymEdits = new Map([['JS', 'Vanilla JavaScript']]);
      const result = applySelectionsToCV(
        BASE_CV, selections, null, null, ACRONYM_RESULT,
        new Map(), [], [], new Map(), new Map(), new Map(), acronymEdits,
      );
      expect(result.skills).toContain('Vanilla JavaScript');
    });

    it('skips historical acronym issues with no actionType without throwing', () => {
      const kwResult: KeywordGapResult = {
        ...ACRONYM_RESULT,
        acronymIssues: [
          { term: 'JS', issue: 'x', fix: 'JavaScript' },
        ],
      };
      const selections: UserSelections = { ...EMPTY_SELECTIONS, selectedAcronymIssues: ['JS'] };
      const result = applySelectionsToCV(BASE_CV, selections, null, null, kwResult);
      expect(result.skills).toEqual(BASE_CV.skills);
    });

    it('does not add acronym fixes when selectedAcronymIssues is empty', () => {
      const result = applySelectionsToCV(BASE_CV, EMPTY_SELECTIONS, null, null, ACRONYM_RESULT);
      expect(result.skills).toEqual(BASE_CV.skills);
    });
  });
});
