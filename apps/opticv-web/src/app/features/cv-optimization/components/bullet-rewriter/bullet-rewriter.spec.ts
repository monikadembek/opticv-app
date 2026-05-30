import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BulletRewriter } from './bullet-rewriter';
import type { BulletUpgradeResult } from '@opticv/datatypes';

const MOCK_RESULT: BulletUpgradeResult = {
  positions: [
    {
      company: 'Acme Corp',
      title: 'Frontend Developer',
      dates: '2021–2024',
      bullets: [
        {
          originalText: 'Did things with React.',
          action: 'rewrite',
          weakness: 'Vague, no metrics.',
          rewrittenText: 'Built React dashboards reducing load time by 40%.',
          rewriteRationale: 'Added measurable impact.',
          needsUserInput: false,
          placeholdersToFill: [],
          actionVerb: 'Built',
          keywordsIncorporated: ['React'],
        },
        {
          originalText: 'Worked on backend tasks occasionally.',
          action: 'recommend_cut',
          weakness: 'Irrelevant to target role.',
          cutReason: 'Does not support the frontend narrative.',
          needsUserInput: false,
          placeholdersToFill: [],
          actionVerb: 'Worked',
          keywordsIncorporated: [],
        },
        {
          originalText: 'Led migration of legacy codebase to TypeScript.',
          action: 'keep_as_is',
          weakness: '',
          needsUserInput: false,
          placeholdersToFill: [],
          actionVerb: 'Led',
          keywordsIncorporated: ['TypeScript'],
        },
      ],
    },
  ],
  missingBulletSuggestions: [
    {
      forPosition: 'Frontend Developer at Acme Corp',
      suggestedBullet: 'Mentored [N] junior developers, improving onboarding time.',
      rationale: 'Leadership bullets strengthen senior applications.',
      questionToAskUser: 'Did you mentor any junior engineers?',
    },
  ],
  overallNotes: 'Overall strong bullets — focus on quantifying impact.',
  verbDiversityCheck: {
    uniqueVerbsUsed: 5,
    totalBullets: 8,
    diverseEnough: true,
  },
};

describe('BulletRewriter', () => {
  let fixture: ComponentFixture<BulletRewriter>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BulletRewriter],
    }).compileComponents();

    fixture = TestBed.createComponent(BulletRewriter);
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('positions and bullets', () => {
    it('renders position title and company', () => {
      expect(fixture.nativeElement.textContent).toContain('Frontend Developer at Acme Corp');
    });

    it('renders position dates when present', () => {
      expect(fixture.nativeElement.textContent).toContain('2021–2024');
    });

    it('shows "No bullet data available" when positions array is empty', () => {
      fixture.componentRef.setInput('result', { ...MOCK_RESULT, positions: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No bullet data available');
    });

    it('does not show "No bullet data available" when positions are present', () => {
      expect(fixture.nativeElement.textContent).not.toContain('No bullet data available');
    });
  });

  describe('rewrite bullets', () => {
    it('renders the original text for rewrite bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('Did things with React.');
    });

    it('renders the rewritten text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Built React dashboards reducing load time by 40%.',
      );
    });

    it('renders the rewrite rationale', () => {
      expect(fixture.nativeElement.textContent).toContain('Added measurable impact.');
    });

    it('renders incorporated keyword badges for rewrite bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('React');
    });

    it('shows placeholder warning when needsUserInput is true and placeholdersToFill is non-empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        positions: [
          {
            ...MOCK_RESULT.positions[0],
            bullets: [
              {
                ...MOCK_RESULT.positions[0].bullets[0],
                needsUserInput: true,
                placeholdersToFill: ['[metric]', '[team size]'],
              },
            ],
          },
        ],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Placeholders to fill');
      expect(fixture.nativeElement.textContent).toContain('[metric]');
      expect(fixture.nativeElement.textContent).toContain('[team size]');
    });

    it('hides placeholder warning when needsUserInput is false', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Placeholders to fill');
    });
  });

  describe('recommend_cut bullets', () => {
    it('renders "Suggested: remove" badge for recommend_cut bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('Suggested: remove');
    });

    it('renders cut reason', () => {
      expect(fixture.nativeElement.textContent).toContain('Does not support the frontend narrative.');
    });
  });

  describe('keep_as_is bullets', () => {
    it('renders "Kept" badge for keep_as_is bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('Kept');
    });

    it('renders the original text for kept bullets', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Led migration of legacy codebase to TypeScript.',
      );
    });
  });

  describe('overall notes', () => {
    it('renders overall notes when present', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Overall strong bullets — focus on quantifying impact.',
      );
    });

    it('hides overall notes section when overallNotes is falsy', () => {
      fixture.componentRef.setInput('result', { ...MOCK_RESULT, overallNotes: '' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Overall strong bullets — focus on quantifying impact.',
      );
    });
  });

  describe('missing bullet suggestions', () => {
    it('renders the "Missing Bullet Suggestions" heading when suggestions are present', () => {
      expect(fixture.nativeElement.textContent).toContain('Missing Bullet Suggestions');
    });

    it('renders the suggested bullet text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Mentored [N] junior developers, improving onboarding time.',
      );
    });

    it('renders the rationale', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Leadership bullets strengthen senior applications.',
      );
    });

    it('renders the question to ask user', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Did you mentor any junior engineers?',
      );
    });

    it('hides "Missing Bullet Suggestions" heading when suggestions array is empty', () => {
      fixture.componentRef.setInput('result', { ...MOCK_RESULT, missingBulletSuggestions: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Missing Bullet Suggestions');
    });
  });

  describe('verb diversity check', () => {
    it('shows good verb variety message when diverseEnough is true', () => {
      expect(fixture.nativeElement.textContent).toContain('Good verb variety');
    });

    it('shows diversify verbs warning when diverseEnough is false', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        verbDiversityCheck: { uniqueVerbsUsed: 2, totalBullets: 8, diverseEnough: false },
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'Consider diversifying your action verbs',
      );
    });

    it('renders unique verb count and total bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('5');
      expect(fixture.nativeElement.textContent).toContain('8');
    });
  });
});
