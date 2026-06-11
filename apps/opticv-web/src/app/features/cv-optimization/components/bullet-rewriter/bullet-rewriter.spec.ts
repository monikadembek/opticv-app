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

  describe('inline editing', () => {
    const REWRITE_BULLET = MOCK_RESULT.positions[0].bullets[0];
    const company = MOCK_RESULT.positions[0].company;
    const title = MOCK_RESULT.positions[0].title;
    const key = `${company}|${title}|${REWRITE_BULLET.originalText}`;

    it('renders the edit button for a rewrite bullet with rewrittenText', () => {
      const btn = fixture.nativeElement.querySelector('[aria-label="Edit rewritten bullet"]');
      expect(btn).toBeTruthy();
    });

    it('does not render the edit button when rewrittenText is absent', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        positions: [
          {
            ...MOCK_RESULT.positions[0],
            bullets: [{ ...REWRITE_BULLET, rewrittenText: undefined }],
          },
        ],
      });
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[aria-label="Edit rewritten bullet"]');
      expect(btn).toBeNull();
    });

    it('emits editStarted with the bullet key when the edit button is clicked', () => {
      const emitted: string[] = [];
      fixture.componentInstance.editStarted.subscribe((k: string) => emitted.push(k));
      const btn: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Edit rewritten bullet"]');
      btn.click();
      expect(emitted).toEqual([key]);
    });

    it('shows the textarea and hides the display paragraph when activeBulletEditKey matches', () => {
      fixture.componentRef.setInput('activeBulletEditKey', key);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea[aria-label="Edit rewritten bullet text"]');
      expect(textarea).toBeTruthy();
    });

    it('does not show the textarea when activeBulletEditKey does not match', () => {
      fixture.componentRef.setInput('activeBulletEditKey', null);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea[aria-label="Edit rewritten bullet text"]');
      expect(textarea).toBeNull();
    });

    it('textarea value reflects editedBulletText input', () => {
      fixture.componentRef.setInput('activeBulletEditKey', key);
      fixture.componentRef.setInput('editedBulletText', 'My custom bullet text');
      fixture.detectChanges();
      const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea[aria-label="Edit rewritten bullet text"]');
      expect(textarea.value).toBe('My custom bullet text');
    });

    it('emits editSaved with key and current editedBulletText when Save is clicked', () => {
      fixture.componentRef.setInput('activeBulletEditKey', key);
      fixture.componentRef.setInput('editedBulletText', 'Saved text');
      fixture.detectChanges();
      const emitted: { key: string; text: string }[] = [];
      fixture.componentInstance.editSaved.subscribe((e: { key: string; text: string }) => emitted.push(e));
      const pButtons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-button');
      const savePBtn = Array.from(pButtons).find((b) => b.getAttribute('label') === 'Save');
      const saveBtn = savePBtn?.querySelector('button') ?? savePBtn;
      saveBtn?.click();
      fixture.detectChanges();
      expect(emitted[0]).toEqual({ key, text: 'Saved text' });
    });

    it('emits editCancelled when Cancel is clicked', () => {
      fixture.componentRef.setInput('activeBulletEditKey', key);
      fixture.detectChanges();
      let cancelled = false;
      fixture.componentInstance.editCancelled.subscribe(() => (cancelled = true));
      const pButtons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-button');
      const cancelPBtn = Array.from(pButtons).find((b) => b.getAttribute('label') === 'Cancel');
      const cancelBtn = cancelPBtn?.querySelector('button') ?? cancelPBtn;
      cancelBtn?.click();
      fixture.detectChanges();
      expect(cancelled).toBe(true);
    });

    it('emits editTextChanged on textarea input event', () => {
      fixture.componentRef.setInput('activeBulletEditKey', key);
      fixture.detectChanges();
      const emitted: string[] = [];
      fixture.componentInstance.editTextChanged.subscribe((t: string) => emitted.push(t));
      const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea[aria-label="Edit rewritten bullet text"]');
      textarea.value = 'new text';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(emitted).toEqual(['new text']);
    });

    it('shows the Edited badge when bulletEdits contains an entry for the bullet', () => {
      const edits = new Map([[key, 'Edited text']]);
      fixture.componentRef.setInput('bulletEdits', edits);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Edited');
    });

    it('does not show the Edited badge when bulletEdits has no entry for the bullet', () => {
      fixture.componentRef.setInput('bulletEdits', new Map());
      fixture.detectChanges();
      const badges: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.bg-blue-100');
      expect(badges.length).toBe(0);
    });

    it('getDisplayText returns edited text when key is in bulletEdits', () => {
      const edits = new Map([[key, 'Custom edited text']]);
      fixture.componentRef.setInput('bulletEdits', edits);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Custom edited text');
    });

    it('getDisplayText returns AI rewrittenText when key is not in bulletEdits', () => {
      fixture.componentRef.setInput('bulletEdits', new Map());
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(REWRITE_BULLET.rewrittenText);
    });
  });
});
