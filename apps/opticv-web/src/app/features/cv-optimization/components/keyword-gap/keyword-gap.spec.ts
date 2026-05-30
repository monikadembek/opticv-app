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
    expect(fixture.nativeElement.textContent).not.toContain('Matched Keywords');
  });

  it('shows matched keywords section when matchedKeywords is non-empty', () => {
    expect(fixture.nativeElement.textContent).toContain('Matched Keywords');
  });

  it('hides missing keywords section when missingKeywords is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, missingKeywords: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Missing Keywords');
  });

  it('shows both sub-groups when both likely-has and genuinely-lacks are populated', () => {
    expect(fixture.nativeElement.textContent).toContain('Likely have — add to your CV');
    expect(fixture.nativeElement.textContent).toContain('Skills to acquire or omit');
  });

  it('shows only likely-has sub-group when missingGenuinelyLacks is empty', () => {
    const onlyLikelyHas: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[0]],
    };
    fixture.componentRef.setInput('result', onlyLikelyHas);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Likely have — add to your CV');
    expect(fixture.nativeElement.textContent).not.toContain('Skills to acquire or omit');
  });

  it('shows only genuinely-lacks sub-group when missingLikelyHas is empty', () => {
    const onlyGenuinelyLacks: KeywordGapResult = {
      ...MOCK_RESULT,
      missingKeywords: [MOCK_RESULT.missingKeywords[1]],
    };
    fixture.componentRef.setInput('result', onlyGenuinelyLacks);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Likely have — add to your CV');
    expect(fixture.nativeElement.textContent).toContain('Skills to acquire or omit');
  });

  it('hides underweighted keywords section when underweightedKeywords is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, underweightedKeywords: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Underweighted Keywords');
  });

  it('hides acronym issues section when acronymIssues is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, acronymIssues: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Acronym Issues');
  });

  it('hides fabrication warnings section when fabricationWarnings is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, fabricationWarnings: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Fabrication Warnings');
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
});
