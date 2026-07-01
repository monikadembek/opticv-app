import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LinkedInUpdates } from './linkedin-updates';
import type { LinkedInRewriteResult } from '@opticv/datatypes';
import { MessageService } from 'primeng/api';
import { LinkedInExportService } from '../../services/linkedin-export.service';

const MOCK_RESULT: LinkedInRewriteResult = {
  headlineVariants: [
    {
      angle: 'title_specialty_value',
      text: 'Senior Frontend Engineer | Angular | Building Scalable UIs',
      characterCount: 58,
      keywordsTargeted: ['Angular', 'Frontend'],
      rationale: 'Leads with title and specialty for ATS.',
    },
    {
      angle: 'outcome_focused',
      text: 'Helping SaaS teams ship faster with Angular',
      characterCount: 43,
      keywordsTargeted: [],
    },
  ],
  recommendedHeadline: 'title_specialty_value',
  aboutRewrite: {
    preview: 'Frontend engineer with 8 years delivering scalable Angular apps.',
    fullText:
      'Frontend engineer with 8 years delivering scalable Angular apps. Open to senior IC roles.',
    characterCount: 89,
    structure: {
      hook: 'Frontend engineer with 8 years',
      story: 'Delivering scalable Angular apps',
      achievements: ['Reduced bundle size by 40%'],
      cta: 'Open to senior IC roles.',
    },
    keywordsIncorporated: ['Angular', 'Frontend'],
  },
  additionalRecommendations: [
    {
      section: 'skills',
      recommendation: 'Add TypeScript to your skills list.',
      priority: 'high',
    },
    {
      section: 'photo',
      recommendation: 'Use a professional headshot.',
      priority: 'low',
    },
    {
      section: 'featured',
      recommendation: 'Pin your best project.',
      priority: 'medium',
    },
  ],
  recommendedSkills: [
    { name: 'TypeScript', isNew: false },
    { name: 'RxJS', isNew: true },
  ],
  targetSearchQueries: ['Angular developer', 'Frontend engineer remote'],
};

describe('LinkedInUpdates', () => {
  let fixture: ComponentFixture<LinkedInUpdates>;
  let exportService: LinkedInExportService;
  let messageService: MessageService;

  const g = globalThis as Record<string, unknown>;
  beforeEach(() => {
    if (!g['navigator']) {
      g['navigator'] = {};
    }
    (g['navigator'] as Record<string, unknown>)['clipboard'] = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LinkedInUpdates],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkedInUpdates);
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();

    exportService = TestBed.inject(LinkedInExportService);
    messageService = TestBed.inject(MessageService);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('headline variants', () => {
    it('renders headline text for first variant', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Senior Frontend Engineer | Angular | Building Scalable UIs',
      );
    });

    it('renders headline text for second variant', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Helping SaaS teams ship faster with Angular',
      );
    });

    it('renders angle label using angleLabels map', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Title / Specialty / Value',
      );
    });

    it('shows Recommended badge on the recommended headline', () => {
      expect(fixture.nativeElement.textContent).toContain('★ Recommended');
    });

    it('does not show Recommended badge when no headline is recommended', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedHeadline: undefined,
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('★ Recommended');
    });

    it('renders keyword tags for variants with keywordsTargeted', () => {
      expect(fixture.nativeElement.textContent).toContain('Angular');
      expect(fixture.nativeElement.textContent).toContain('Frontend');
    });

    it('renders rationale when present', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Leads with title and specialty for ATS.',
      );
    });

    it('renders character count for variants', () => {
      expect(fixture.nativeElement.textContent).toContain('58 / 220 chars');
    });
  });

  describe('about section', () => {
    it('renders preview text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Frontend engineer with 8 years delivering scalable Angular apps.',
      );
    });

    it('renders full text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Open to senior IC roles.',
      );
    });

    it('renders character count for about section', () => {
      expect(fixture.nativeElement.textContent).toContain('89 / 2600 chars');
    });

    it('renders keywords incorporated when present', () => {
      expect(fixture.nativeElement.textContent).toContain('Keywords used:');
    });

    it('hides keywords incorporated section when array is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        aboutRewrite: {
          ...MOCK_RESULT.aboutRewrite,
          keywordsIncorporated: [],
        },
      });
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      const firstOccurrence = text.indexOf('Keywords used:');
      const secondOccurrence = text.indexOf(
        'Keywords used:',
        firstOccurrence + 1,
      );
      expect(secondOccurrence).toBe(-1);
    });
  });

  describe('recommended skills', () => {
    it('renders skill chips when recommendedSkills is non-empty', () => {
      expect(fixture.nativeElement.textContent).toContain('TypeScript');
      expect(fixture.nativeElement.textContent).toContain('RxJS');
    });

    it('renders blue chip for CV skill (isNew: false)', () => {
      const chips = fixture.nativeElement.querySelectorAll('span.bg-blue-100');
      const names = Array.from(chips).map((el) =>
        (el as HTMLElement).textContent?.trim(),
      );
      expect(names).toContain('TypeScript');
    });

    it('renders green chip for new skill (isNew: true)', () => {
      const chips = fixture.nativeElement.querySelectorAll('span.bg-green-100');
      const text = Array.from(chips)
        .map((el) => (el as HTMLElement).textContent)
        .join('');
      expect(text).toContain('RxJS');
    });

    it('shows legend label for new skills', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.textContent).toContain('Suggested new skills');
    });

    it('shows "No skills recommended" when recommendedSkills is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: [],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'No skills recommended',
      );
    });

    it('shows "No skills recommended" when recommendedSkills is undefined', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: undefined,
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'No skills recommended',
      );
    });
  });

  describe('profile recommendations', () => {
    it('renders recommendation text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Add TypeScript to your skills list.',
      );
    });

    it('renders section label using sectionLabels map', () => {
      expect(fixture.nativeElement.textContent).toContain('Skills');
    });

    it('renders priority text for each recommendation', () => {
      expect(fixture.nativeElement.textContent).toContain('high');
      expect(fixture.nativeElement.textContent).toContain('medium');
      expect(fixture.nativeElement.textContent).toContain('low');
    });

    it('shows "No additional recommendations" when list is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        additionalRecommendations: [],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'No additional recommendations',
      );
    });
  });

  describe('target search queries', () => {
    it('renders search query text', () => {
      expect(fixture.nativeElement.textContent).toContain('Angular developer');
      expect(fixture.nativeElement.textContent).toContain(
        'Frontend engineer remote',
      );
    });
  });

  describe('sortedRecommendations', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('sorts high priority before medium before low', () => {
      const sorted = comp().sortedRecommendations();
      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('returns an empty array when additionalRecommendations is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        additionalRecommendations: [],
      });
      fixture.detectChanges();
      expect(comp().sortedRecommendations()).toEqual([]);
    });
  });

  describe('hasSkills', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('returns true when recommendedSkills is non-empty', () => {
      expect(comp().hasSkills()).toBe(true);
    });

    it('returns false when recommendedSkills is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: [],
      });
      fixture.detectChanges();
      expect(comp().hasSkills()).toBe(false);
    });

    it('returns false when recommendedSkills is undefined', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: undefined,
      });
      fixture.detectChanges();
      expect(comp().hasSkills()).toBe(false);
    });
  });

  describe('skillsCount', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('returns the number of recommendedSkills', () => {
      expect(comp().skillsCount()).toBe(2);
    });

    it('returns 0 when recommendedSkills is undefined', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: undefined,
      });
      fixture.detectChanges();
      expect(comp().skillsCount()).toBe(0);
    });
  });

  describe('recommendedSkills computed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('slices to 50 entries when more than 50 are provided', () => {
      const manySkills = Array.from({ length: 51 }, (_, i) => ({
        name: `Skill${i}`,
        isNew: false,
      }));
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: manySkills,
      });
      fixture.detectChanges();
      expect(comp().recommendedSkills().length).toBe(50);
    });

    it('preserves array order', () => {
      const ordered = [
        { name: 'First', isNew: false },
        { name: 'Second', isNew: true },
      ];
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        recommendedSkills: ordered,
      });
      fixture.detectChanges();
      const result = comp().recommendedSkills();
      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
    });
  });

  describe('copyAllSkills', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clipboardWriteText = () =>
      (navigator as any).clipboard.writeText as ReturnType<typeof vi.fn>;

    it('copies comma-joined skill names to clipboard', () => {
      comp().copyAllSkills();
      expect(clipboardWriteText()).toHaveBeenCalledWith('TypeScript, RxJS');
    });
  });

  describe('priorityClass', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('returns red class for high priority', () => {
      expect(comp().priorityClass('high')).toBe('text-red-600');
    });

    it('returns yellow class for medium priority', () => {
      expect(comp().priorityClass('medium')).toBe('text-yellow-600');
    });

    it('returns gray class for low priority', () => {
      expect(comp().priorityClass('low')).toBe('text-gray-500');
    });
  });

  describe('charCountClass', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('returns red class when count exceeds max', () => {
      expect(comp().charCountClass(230, 220)).toBe('text-red-600');
    });

    it('returns amber class when count is above 90% of max', () => {
      expect(comp().charCountClass(200, 220)).toBe('text-amber-500');
    });

    it('returns gray class when count is within safe range', () => {
      expect(comp().charCountClass(100, 220)).toBe('text-gray-500');
    });

    it('returns gray class at exactly 90% of max', () => {
      expect(comp().charCountClass(198, 220)).toBe('text-gray-500');
    });

    it('returns amber class just above 90% of max', () => {
      expect(comp().charCountClass(199, 220)).toBe('text-amber-500');
    });
  });

  describe('copyToClipboard', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clipboardWriteText = () =>
      (navigator as any).clipboard.writeText as ReturnType<typeof vi.fn>;

    it('calls navigator.clipboard.writeText with the provided text', () => {
      comp().copyToClipboard('Copy this text');
      expect(clipboardWriteText()).toHaveBeenCalledWith('Copy this text');
    });

    it('calls messageService.add with warn severity when clipboard write fails', async () => {
      clipboardWriteText().mockRejectedValue(new Error('permission denied'));
      const addSpy = vi.spyOn(messageService, 'add');

      comp().copyToClipboard('some text');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn' }),
      );
    });
  });

  describe('export buttons', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = () => fixture.componentInstance as any;

    it('renders "Export PDF" and "Export DOCX" buttons', () => {
      expect(fixture.nativeElement.textContent).toContain('Export PDF');
      expect(fixture.nativeElement.textContent).toContain('Export DOCX');
    });

    it('sets isBusyPdf to true while PDF export is in progress', () => {
      let resolvePdf!: () => void;
      vi.spyOn(exportService, 'exportToPdf').mockReturnValue(
        new Promise<void>((resolve) => {
          resolvePdf = resolve;
        }),
      );

      comp().onExportPdf();
      expect(comp().isBusyPdf()).toBe(true);
      resolvePdf();
    });

    it('sets isBusyDocx to true while DOCX export is in progress', () => {
      let resolveDocx!: () => void;
      vi.spyOn(exportService, 'exportToDocx').mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDocx = resolve;
        }),
      );

      comp().onExportDocx();
      expect(comp().isBusyDocx()).toBe(true);
      resolveDocx();
    });

    it('resets isBusyPdf to false after PDF export completes', async () => {
      vi.spyOn(exportService, 'exportToPdf').mockResolvedValue(undefined);
      await comp().onExportPdf();
      expect(comp().isBusyPdf()).toBe(false);
    });

    it('resets isBusyDocx to false after DOCX export completes', async () => {
      vi.spyOn(exportService, 'exportToDocx').mockResolvedValue(undefined);
      await comp().onExportDocx();
      expect(comp().isBusyDocx()).toBe(false);
    });

    it('calls messageService.add with error severity when PDF export throws', async () => {
      vi.spyOn(exportService, 'exportToPdf').mockRejectedValue(
        new Error('fail'),
      );
      const addSpy = vi.spyOn(messageService, 'add');

      await comp().onExportPdf();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
      expect(comp().isBusyPdf()).toBe(false);
    });

    it('calls messageService.add with error severity when DOCX export throws', async () => {
      vi.spyOn(exportService, 'exportToDocx').mockRejectedValue(
        new Error('fail'),
      );
      const addSpy = vi.spyOn(messageService, 'add');

      await comp().onExportDocx();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
      expect(comp().isBusyDocx()).toBe(false);
    });

    it('disables both buttons while PDF export is in progress', () => {
      let resolvePdf!: () => void;
      vi.spyOn(exportService, 'exportToPdf').mockReturnValue(
        new Promise<void>((resolve) => {
          resolvePdf = resolve;
        }),
      );

      fixture.componentInstance.onExportPdf();
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('button'),
      );
      const pdfButton = buttons.find((b) =>
        b.textContent?.includes('Export PDF'),
      )!;
      const docxButton = buttons.find((b) =>
        b.textContent?.includes('Export DOCX'),
      )!;

      expect(pdfButton.disabled).toBe(true);
      expect(docxButton.disabled).toBe(true);
      resolvePdf();
    });

    it('disables both buttons while DOCX export is in progress', () => {
      let resolveDocx!: () => void;
      vi.spyOn(exportService, 'exportToDocx').mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDocx = resolve;
        }),
      );

      fixture.componentInstance.onExportDocx();
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('button'),
      );
      const pdfButton = buttons.find((b) =>
        b.textContent?.includes('Export PDF'),
      )!;
      const docxButton = buttons.find((b) =>
        b.textContent?.includes('Export DOCX'),
      )!;

      expect(pdfButton.disabled).toBe(true);
      expect(docxButton.disabled).toBe(true);
      resolveDocx();
    });

    it('re-enables both buttons after PDF export completes', async () => {
      vi.spyOn(exportService, 'exportToPdf').mockResolvedValue(undefined);
      await fixture.componentInstance.onExportPdf();
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('button'),
      );
      const pdfButton = buttons.find((b) =>
        b.textContent?.includes('Export PDF'),
      )!;
      const docxButton = buttons.find((b) =>
        b.textContent?.includes('Export DOCX'),
      )!;

      expect(pdfButton.disabled).toBe(false);
      expect(docxButton.disabled).toBe(false);
    });

    it('re-enables both buttons after DOCX export completes', async () => {
      vi.spyOn(exportService, 'exportToDocx').mockResolvedValue(undefined);
      await fixture.componentInstance.onExportDocx();
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(
        host.querySelectorAll<HTMLButtonElement>('button'),
      );
      const pdfButton = buttons.find((b) =>
        b.textContent?.includes('Export PDF'),
      )!;
      const docxButton = buttons.find((b) =>
        b.textContent?.includes('Export DOCX'),
      )!;

      expect(pdfButton.disabled).toBe(false);
      expect(docxButton.disabled).toBe(false);
    });
  });
});
