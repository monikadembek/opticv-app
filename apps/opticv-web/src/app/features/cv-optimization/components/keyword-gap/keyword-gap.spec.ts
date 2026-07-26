import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeywordGap } from './keyword-gap';
import type { KeywordGapResult } from '@opticv/datatypes';

const MOCK_RESULT: KeywordGapResult = {
  matchScore: 72,
  matchScoreBreakdown: {
    requiredMatched: 8,
    requiredTotal: 10,
    preferredMatched: 4,
    preferredTotal: 7,
  },
  matchedKeywords: [
    { keyword: 'TypeScript', matchType: 'exact', occurrencesInResume: 3, isRequired: true },
    { keyword: 'React', matchType: 'semantic', occurrencesInResume: 2, isRequired: false },
    { keyword: 'Node', matchType: 'partial', occurrencesInResume: 1, isRequired: false },
  ],
  missingKeywords: [
    {
      keyword: 'Docker',
      category: 'tools',
      importance: 'critical',
      isRequired: true,
      candidateLikelyHas: true,
      evidenceFromResume: 'Mentioned containerization in project section.',
      recommendation: 'Add Docker explicitly to your skills section.',
      suggestedPlacement: 'skills',
    },
    {
      keyword: 'Kubernetes',
      category: 'tools',
      importance: 'high',
      isRequired: false,
      candidateLikelyHas: false,
      evidenceFromResume: '',
      recommendation: 'Acquire Kubernetes knowledge or omit from application.',
      suggestedPlacement: 'skills',
    },
    {
      keyword: 'GraphQL',
      category: 'tools',
      importance: 'high',
      isRequired: true,
      candidateLikelyHas: true,
      evidenceFromResume: 'Worked with REST APIs, similar concepts apply.',
      recommendation: "Add 'Built GraphQL API layer.' to your experience.",
      suggestedPlacement: 'experience_bullet',
    },
  ],
  underweightedKeywords: [
    {
      keyword: 'CI/CD',
      currentOccurrences: 1,
      recommendedOccurrences: 3,
      suggestedAdditions: ['Add CI/CD to summary', 'Mention in experience bullets'],
    },
  ],
  fabricationWarnings: [
    { keyword: 'Hadoop', reason: 'No evidence of Hadoop experience found in resume.' },
  ],
  acronymIssues: [
    { term: 'CI/CD', issue: 'Only abbreviation used', fix: 'Add full form: Continuous Integration/Continuous Deployment' },
  ],
};

describe('KeywordGap', () => {
  let fixture: ComponentFixture<KeywordGap>;
  let component: KeywordGap;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [KeywordGap],
    }).compileComponents();

    fixture = TestBed.createComponent(KeywordGap);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('scoreColor returns red for score <= 49', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 30 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('red');

    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 49 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('red');
  });

  it('scoreColor returns amber for score 50-74', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 60 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('amber');

    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 74 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('amber');
  });

  it('scoreColor returns green for score >= 75', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 75 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('green');

    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchScore: 100 });
    fixture.detectChanges();
    expect(component.scoreColor()).toBe('green');
  });

  it('hides matched keywords section when matchedKeywords is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, matchedKeywords: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Matched keywords');
  });

  it('shows matched keywords section when matchedKeywords is non-empty', () => {
    expect(fixture.nativeElement.textContent).toContain('Matched keywords');
  });

  it('hides missing keywords section when missingKeywords is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, missingKeywords: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Missing Keywords');
  });

  it('shows both sub-groups when both likely-has and genuinely-lacks are populated', () => {
    expect(fixture.nativeElement.textContent).toContain('Likely have - add to your CV');
    expect(fixture.nativeElement.textContent).toContain('Skills to acquire or omit');
  });

  it('shows only likely-has sub-group when missingGenuinelyLacks is empty', () => {
    const onlyLikelyHas: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[0]],
    };
    fixture.componentRef.setInput('result', onlyLikelyHas);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Likely have - add to your CV');
    expect(fixture.nativeElement.textContent).not.toContain('Skills to acquire or omit');
  });

  it('shows only genuinely-lacks sub-group when missingLikelyHas is empty', () => {
    const onlyGenuinelyLacks: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[1]],
    };
    fixture.componentRef.setInput('result', onlyGenuinelyLacks);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Likely have - add to your CV');
    expect(fixture.nativeElement.textContent).toContain('Skills to acquire or omit');
  });

  it('hides underweighted keywords section when underweightedKeywords is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, underweightedKeywords: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Underweighted keywords');
  });

  it('hides acronym issues section when acronymIssues is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, acronymIssues: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Acronym issues');
  });

  it('hides fabrication warnings section when fabricationWarnings is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, fabricationWarnings: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Fabrication warnings');
  });

  it('renders fabrication warnings with amber background when non-empty', () => {
    const warningContainer = fixture.nativeElement.querySelector('.bg-amber-50');
    expect(warningContainer).not.toBeNull();
  });

  it('does not render evidenceFromResume block when field is empty string', () => {
    const itemWithEmptyEvidence: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[1]],
    };
    fixture.componentRef.setInput('result', itemWithEmptyEvidence);
    fixture.detectChanges();
    const evidenceBlocks = fixture.nativeElement.querySelectorAll('.border-l.border-surface-200');
    expect(evidenceBlocks.length).toBe(0);
  });

  it('renders evidenceFromResume block when field is non-empty', () => {
    const itemWithEvidence: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[0]],
    };
    fixture.componentRef.setInput('result', itemWithEvidence);
    fixture.detectChanges();
    const evidenceBlocks = fixture.nativeElement.querySelectorAll('.border-l.border-surface-200');
    expect(evidenceBlocks.length).toBe(1);
  });

  it('splits matched keywords into exact and semantic groups', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Exact match');
    expect(text).toContain('Semantic match');
    expect(component.exactMatchedKeywords().map((k) => k.keyword)).toEqual(['TypeScript']);
    expect(component.semanticMatchedKeywords().map((k) => k.keyword)).toEqual(['React', 'Node']);
  });

  it('collapses underweighted keywords, acronym issues, and fabrication warnings by default', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('CI/CD to summary');
    expect(text).not.toContain('Only abbreviation used');
    expect(text).not.toContain('No evidence of Hadoop experience found in resume.');
  });

  it('expands underweighted keywords panel on toggle', () => {
    component.toggleUnderweighted();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Add CI/CD to summary');
  });

  it('expands acronym issues panel on toggle', () => {
    component.toggleAcronymIssues();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Only abbreviation used');
  });

  it('expands fabrication warnings panel on toggle', () => {
    component.toggleFabricationWarnings();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No evidence of Hadoop experience found in resume.');
  });

  describe('experience bullet position picker', () => {
    const graphqlOnly: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[2]],
    };

    beforeEach(() => {
      fixture.componentRef.setInput('result', graphqlOnly);
      fixture.componentRef.setInput('selectedKeywords', ['GraphQL']);
      fixture.componentRef.setInput('experiencePositions', [
        'Acme Corp - Frontend Developer',
        'Beta Inc - Engineer',
      ]);
      fixture.detectChanges();
    });

    it('does not render the position select when the keyword is not selected', () => {
      fixture.componentRef.setInput('selectedKeywords', []);
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('#kw-pos-GraphQL');
      expect(select).toBeNull();
    });

    it('renders one option per experience position plus the placeholder', () => {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('#kw-pos-GraphQL');
      expect(select).not.toBeNull();
      expect(select.options.length).toBe(3);
      expect(select.options[1].textContent).toContain('Acme Corp - Frontend Developer');
      expect(select.options[2].textContent).toContain('Beta Inc - Engineer');
    });

    it('getKeywordPosition returns null when no entry exists for the keyword', () => {
      expect(component.getKeywordPosition('GraphQL')).toBeNull();
    });

    it('getKeywordPosition returns the stored experienceIndex when one exists', () => {
      fixture.componentRef.setInput('keywordBulletPositions', new Map([['GraphQL', 1]]));
      fixture.detectChanges();
      expect(component.getKeywordPosition('GraphQL')).toBe(1);
    });

    it('select.value reflects the stored experienceIndex in the DOM', () => {
      fixture.componentRef.setInput('keywordBulletPositions', new Map([['GraphQL', 1]]));
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('#kw-pos-GraphQL');
      expect(select.value).toBe('1');
    });

    it('onPositionChange emits experienceIndex: null when the placeholder is chosen', () => {
      const emitted: Array<{ keyword: string; experienceIndex: number | null }> = [];
      component.keywordBulletPositionSelected.subscribe((e) => emitted.push(e));
      component.onPositionChange('GraphQL', '');
      expect(emitted).toEqual([{ keyword: 'GraphQL', experienceIndex: null }]);
    });

    it('onPositionChange emits the numeric experienceIndex when an option is chosen', () => {
      const emitted: Array<{ keyword: string; experienceIndex: number | null }> = [];
      component.keywordBulletPositionSelected.subscribe((e) => emitted.push(e));
      component.onPositionChange('GraphQL', '1');
      expect(emitted).toEqual([{ keyword: 'GraphQL', experienceIndex: 1 }]);
    });

    it('does not show the "pick a position" warning when index 0 is selected', () => {
      fixture.componentRef.setInput('keywordBulletPositions', new Map([['GraphQL', 0]]));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Pick a position to include this in your CV.');
    });

    it('shows the "pick a position" warning when no index is selected', () => {
      expect(fixture.nativeElement.textContent).toContain('Pick a position to include this in your CV.');
    });
  });
});
