import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AtsScore } from './ats-score';
import type { ResumeAutopsyResult } from '@opticv/datatypes';

const MOCK_RESULT: ResumeAutopsyResult = {
  overallScore: 47,
  predictedScoreAfterFixes: 82,
  topPriority: 'Add missing keywords from job description',
  summary: 'Your CV has several areas that need improvement.',
  issues: [
    {
      id: '1',
      category: 'keywords',
      severity: 'critical',
      title: 'Missing keywords',
      quotedText: 'Python, Docker',
      location: 'Skills section',
      whyItMatters: 'ATS will reject the CV without these keywords.',
      fix: 'Add Python and Docker to your skills section.',
      estimatedImpact: 9,
    },
    {
      id: '2',
      category: 'formatting',
      severity: 'medium',
      title: 'Inconsistent date format',
      quotedText: '',
      location: 'Experience section',
      whyItMatters: 'Confuses ATS parsers.',
      fix: 'Use MM/YYYY format consistently.',
      estimatedImpact: 4,
    },
  ],
  strengths: [
    {
      title: 'Clear contact info',
      detail: 'All required contact fields are present.',
    },
  ],
};

describe('AtsScore', () => {
  let fixture: ComponentFixture<AtsScore>;
  let component: AtsScore;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AtsScore],
    }).compileComponents();

    fixture = TestBed.createComponent(AtsScore);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('renders score rings', () => {
    const svgs = fixture.nativeElement.querySelectorAll('svg[role="img"]');
    expect(svgs.length).toBe(2);
  });

  it('renders summary section', () => {
    expect(fixture.nativeElement.textContent).toContain(MOCK_RESULT.summary);
  });

  it('renders issues section when issues are present', () => {
    expect(fixture.nativeElement.textContent).toContain('Issues');
  });

  it('renders strengths section when strengths are present', () => {
    expect(fixture.nativeElement.textContent).toContain('Strengths');
    expect(fixture.nativeElement.textContent).toContain('Clear contact info');
  });

  it('does not render issues section when issues array is empty', () => {
    fixture.componentRef.setInput('data', { ...MOCK_RESULT, issues: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Issues');
  });

  it('does not render strengths section when strengths array is empty', () => {
    fixture.componentRef.setInput('data', { ...MOCK_RESULT, strengths: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Strengths');
  });

  it('scoreColorClass returns correct class for low score (<=49)', () => {
    expect(component.scoreColorClass(30)).toBe('text-red-500');
    expect(component.scoreColorClass(49)).toBe('text-red-500');
  });

  it('scoreColorClass returns correct class for medium score (50-74)', () => {
    expect(component.scoreColorClass(60)).toBe('text-amber-500');
    expect(component.scoreColorClass(74)).toBe('text-amber-500');
  });

  it('scoreColorClass returns correct class for high score (>=75)', () => {
    expect(component.scoreColorClass(80)).toBe('text-green-500');
    expect(component.scoreColorClass(100)).toBe('text-green-500');
  });

  it('strokeDashoffset returns 0 for score 100', () => {
    expect(component.strokeDashoffset(100)).toBeCloseTo(0);
  });

  it('strokeDashoffset returns full circumference for score 0', () => {
    expect(component.strokeDashoffset(0)).toBeCloseTo(
      component.ringCircumference,
    );
  });

  it('strokeDashoffset returns half circumference for score 50', () => {
    expect(component.strokeDashoffset(50)).toBeCloseTo(
      component.ringCircumference / 2,
    );
  });

  it('toggleIssue adds id to expanded set', () => {
    component.toggleIssue('1');
    expect(component.isIssueExpanded('1')).toBe(true);
  });

  it('toggleIssue removes id when called again', () => {
    component.toggleIssue('1');
    component.toggleIssue('1');
    expect(component.isIssueExpanded('1')).toBe(false);
  });

  it('does not render quotedText blockquote when quotedText is empty string', () => {
    component.toggleIssue('2');
    fixture.detectChanges();
    const blockquotes = fixture.nativeElement.querySelectorAll('blockquote');
    expect(blockquotes.length).toBe(0);
  });

  it('renders quotedText blockquote when quotedText is non-empty', () => {
    component.toggleIssue('1');
    fixture.detectChanges();
    const blockquotes = fixture.nativeElement.querySelectorAll('blockquote');
    expect(blockquotes.length).toBe(1);
  });
});
