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

    it('renders the rewrite rationale after expanding "Why this works"', () => {
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[aria-controls^="why-"]',
      );
      toggle.click();
      fixture.detectChanges();
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

    it('renders the position title/company header for a rewrite bullet', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Frontend Developer at Acme Corp - bullet point rewrite',
      );
    });
  });

  describe('selected state background', () => {
    const REWRITE_BULLET = MOCK_RESULT.positions[0].bullets[0];
    const company = MOCK_RESULT.positions[0].company;
    const title = MOCK_RESULT.positions[0].title;

    it('applies the selected background class when the rewrite bullet is selected', () => {
      fixture.componentRef.setInput('selectedBullets', [
        { company, title, originalText: REWRITE_BULLET.originalText },
      ]);
      fixture.detectChanges();
      const item: HTMLElement = fixture.nativeElement.querySelector('li');
      expect(item.classList.contains('bg-green-50')).toBe(true);
    });

    it('does not apply the selected background class when the rewrite bullet is not selected', () => {
      fixture.componentRef.setInput('selectedBullets', []);
      fixture.detectChanges();
      const item: HTMLElement = fixture.nativeElement.querySelector('li');
      expect(item.classList.contains('bg-green-50')).toBe(false);
    });
  });

  describe('"Why this works" toggle', () => {
    const REWRITE_BULLET = MOCK_RESULT.positions[0].bullets[0];

    it('is collapsed by default', () => {
      expect(fixture.nativeElement.textContent).not.toContain(REWRITE_BULLET.weakness);
      expect(fixture.nativeElement.textContent).not.toContain(REWRITE_BULLET.rewriteRationale);
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[aria-controls^="why-"]',
      );
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('expands and collapses the weakness/reason text on click', () => {
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[aria-controls^="why-"]',
      );
      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.textContent).toContain(REWRITE_BULLET.weakness);
      expect(fixture.nativeElement.textContent).toContain(REWRITE_BULLET.rewriteRationale);

      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.textContent).not.toContain(REWRITE_BULLET.weakness);
    });

    it('does not render when both weakness and rewriteRationale are absent', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        positions: [
          {
            ...MOCK_RESULT.positions[0],
            bullets: [
              { ...REWRITE_BULLET, weakness: '', rewriteRationale: undefined },
            ],
          },
        ],
      });
      fixture.detectChanges();
      const toggle = fixture.nativeElement.querySelector('button[aria-controls^="why-"]');
      expect(toggle).toBeNull();
    });

    it('toggles independently per bullet', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        positions: [
          {
            ...MOCK_RESULT.positions[0],
            bullets: [
              REWRITE_BULLET,
              {
                ...REWRITE_BULLET,
                originalText: 'Wrote some tests occasionally.',
                rewrittenText: 'Authored a comprehensive automated test suite.',
                weakness: 'No mention of coverage.',
                rewriteRationale: 'Quantifies testing effort.',
              },
            ],
          },
        ],
      });
      fixture.detectChanges();

      const toggles: NodeListOf<HTMLButtonElement> =
        fixture.nativeElement.querySelectorAll('button[aria-controls^="why-"]');
      expect(toggles.length).toBe(2);

      toggles[0].click();
      fixture.detectChanges();

      expect(toggles[0].getAttribute('aria-expanded')).toBe('true');
      expect(toggles[1].getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.textContent).not.toContain('No mention of coverage.');
    });

    it('renders each bullet in a position\'s list with its own original/rewritten text', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        positions: [
          {
            ...MOCK_RESULT.positions[0],
            bullets: [
              REWRITE_BULLET,
              {
                ...REWRITE_BULLET,
                originalText: 'Wrote some tests occasionally.',
                rewrittenText: 'Authored a comprehensive automated test suite.',
              },
            ],
          },
        ],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Did things with React.');
      expect(fixture.nativeElement.textContent).toContain('Wrote some tests occasionally.');
      expect(fixture.nativeElement.textContent).toContain(
        'Built React dashboards reducing load time by 40%.',
      );
      expect(fixture.nativeElement.textContent).toContain(
        'Authored a comprehensive automated test suite.',
      );
    });
  });

  describe('recommend_cut bullets', () => {
    it('renders "Suggested: remove" badge for recommend_cut bullets', () => {
      expect(fixture.nativeElement.textContent).toContain('Suggested: remove');
    });

    it('renders cut reason', () => {
      expect(fixture.nativeElement.textContent).toContain('Does not support the frontend narrative.');
    });

    it('renders "Will be removed" badge when bullet is in removedBullets', () => {
      const cutBullet = MOCK_RESULT.positions[0].bullets[1];
      fixture.componentRef.setInput('removedBullets', [
        { company: MOCK_RESULT.positions[0].company, title: MOCK_RESULT.positions[0].title, originalText: cutBullet.originalText },
      ]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Will be removed');
    });

    it('does not render "Will be removed" when bullet is not in removedBullets', () => {
      fixture.componentRef.setInput('removedBullets', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Will be removed');
    });

    it('emits removedBulletToggled when the remove checkbox changes', () => {
      const cutBullet = MOCK_RESULT.positions[0].bullets[1];
      const emitted: { company: string; title: string; originalText: string }[] = [];
      fixture.componentInstance.removedBulletToggled.subscribe((k) => emitted.push(k));
      const checkboxes: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
      const removeCheckbox = Array.from(checkboxes).find((cb) =>
        cb.getAttribute('aria-label')?.startsWith('Remove bullet'),
      );
      removeCheckbox?.click();
      expect(emitted[0]).toEqual({
        company: MOCK_RESULT.positions[0].company,
        title: MOCK_RESULT.positions[0].title,
        originalText: cutBullet.originalText,
      });
    });

    it('isRemovedBullet returns true when the bullet is in removedBullets', () => {
      const cutBullet = MOCK_RESULT.positions[0].bullets[1];
      fixture.componentRef.setInput('removedBullets', [
        { company: MOCK_RESULT.positions[0].company, title: MOCK_RESULT.positions[0].title, originalText: cutBullet.originalText },
      ]);
      fixture.detectChanges();
      expect(
        fixture.componentInstance.isRemovedBullet(
          MOCK_RESULT.positions[0].company,
          MOCK_RESULT.positions[0].title,
          cutBullet.originalText,
        ),
      ).toBe(true);
    });

    it('isRemovedBullet returns false when the bullet is not in removedBullets', () => {
      fixture.componentRef.setInput('removedBullets', []);
      expect(
        fixture.componentInstance.isRemovedBullet(
          MOCK_RESULT.positions[0].company,
          MOCK_RESULT.positions[0].title,
          'some other bullet',
        ),
      ).toBe(false);
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
    const SUGGESTION = MOCK_RESULT.missingBulletSuggestions[0];
    const missingKey = `${SUGGESTION.forPosition}|${SUGGESTION.suggestedBullet}`;

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

    it('emits missingBulletToggled when the add checkbox changes', () => {
      const emitted: { forPosition: string; suggestedBullet: string }[] = [];
      fixture.componentInstance.missingBulletToggled.subscribe((k) => emitted.push(k));
      const checkboxes: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
      const addCheckbox = Array.from(checkboxes).find((cb) =>
        cb.getAttribute('aria-label')?.startsWith('Add suggested bullet'),
      );
      addCheckbox?.click();
      expect(emitted[0]).toEqual({
        forPosition: SUGGESTION.forPosition,
        suggestedBullet: SUGGESTION.suggestedBullet,
      });
    });

    it('isMissingSelected returns true when the suggestion is in selectedMissingBullets', () => {
      fixture.componentRef.setInput('selectedMissingBullets', [
        { forPosition: SUGGESTION.forPosition, suggestedBullet: SUGGESTION.suggestedBullet },
      ]);
      fixture.detectChanges();
      expect(
        fixture.componentInstance.isMissingSelected(SUGGESTION.forPosition, SUGGESTION.suggestedBullet),
      ).toBe(true);
    });

    it('isMissingSelected returns false when not in selectedMissingBullets', () => {
      fixture.componentRef.setInput('selectedMissingBullets', []);
      expect(
        fixture.componentInstance.isMissingSelected(SUGGESTION.forPosition, SUGGESTION.suggestedBullet),
      ).toBe(false);
    });

    it('shows the edit button for a selected missing bullet', () => {
      fixture.componentRef.setInput('selectedMissingBullets', [
        { forPosition: SUGGESTION.forPosition, suggestedBullet: SUGGESTION.suggestedBullet },
      ]);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[aria-label="Edit suggested bullet"]');
      expect(btn).toBeTruthy();
    });

    it('does not show the edit button for an unselected missing bullet', () => {
      fixture.componentRef.setInput('selectedMissingBullets', []);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[aria-label="Edit suggested bullet"]');
      expect(btn).toBeNull();
    });

    it('emits missingBulletEditStarted with the missing bullet key when edit button is clicked', () => {
      fixture.componentRef.setInput('selectedMissingBullets', [
        { forPosition: SUGGESTION.forPosition, suggestedBullet: SUGGESTION.suggestedBullet },
      ]);
      fixture.detectChanges();
      const emitted: string[] = [];
      fixture.componentInstance.missingBulletEditStarted.subscribe((k: string) => emitted.push(k));
      const btn: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Edit suggested bullet"]');
      btn.click();
      expect(emitted).toEqual([missingKey]);
    });

    it('shows the textarea when activeBulletEditKey matches the missing bullet key', () => {
      fixture.componentRef.setInput('activeBulletEditKey', missingKey);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea[aria-label="Edit suggested bullet text"]');
      expect(textarea).toBeTruthy();
    });

    it('does not show the textarea when activeBulletEditKey does not match', () => {
      fixture.componentRef.setInput('activeBulletEditKey', null);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea[aria-label="Edit suggested bullet text"]');
      expect(textarea).toBeNull();
    });

    it('emits missingBulletEditSaved with key and text when Save is clicked', () => {
      fixture.componentRef.setInput('activeBulletEditKey', missingKey);
      fixture.componentRef.setInput('editedBulletText', 'Edited missing bullet');
      fixture.detectChanges();
      const emitted: { key: string; text: string }[] = [];
      fixture.componentInstance.missingBulletEditSaved.subscribe((e) => emitted.push(e));
      const pButtons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-button');
      const savePBtn = Array.from(pButtons).find((b) => b.getAttribute('label') === 'Save');
      const saveBtn = savePBtn?.querySelector('button') ?? savePBtn;
      saveBtn?.click();
      fixture.detectChanges();
      expect(emitted[0]).toEqual({ key: missingKey, text: 'Edited missing bullet' });
    });

    it('shows the Edited badge when missingBulletEdits contains an entry for the suggestion', () => {
      const edits = new Map([[missingKey, 'Custom missing text']]);
      fixture.componentRef.setInput('missingBulletEdits', edits);
      fixture.detectChanges();
      const badges: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.bg-blue-100');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('getMissingDisplayText returns edited text when key is in missingBulletEdits', () => {
      const edits = new Map([[missingKey, 'My custom missing bullet']]);
      fixture.componentRef.setInput('missingBulletEdits', edits);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('My custom missing bullet');
    });

    it('getMissingDisplayText returns suggestedBullet when key is not in missingBulletEdits', () => {
      fixture.componentRef.setInput('missingBulletEdits', new Map());
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(SUGGESTION.suggestedBullet);
    });

    it('missingBulletKey builds the correct composite key', () => {
      expect(
        fixture.componentInstance.missingBulletKey(SUGGESTION.forPosition, SUGGESTION.suggestedBullet),
      ).toBe(missingKey);
    });

    it('isMissingEdited returns true when key is in missingBulletEdits', () => {
      fixture.componentRef.setInput('missingBulletEdits', new Map([[missingKey, 'text']]));
      expect(
        fixture.componentInstance.isMissingEdited(SUGGESTION.forPosition, SUGGESTION.suggestedBullet),
      ).toBe(true);
    });

    it('isMissingEditing returns true when activeBulletEditKey matches the missing key', () => {
      fixture.componentRef.setInput('activeBulletEditKey', missingKey);
      expect(
        fixture.componentInstance.isMissingEditing(SUGGESTION.forPosition, SUGGESTION.suggestedBullet),
      ).toBe(true);
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
