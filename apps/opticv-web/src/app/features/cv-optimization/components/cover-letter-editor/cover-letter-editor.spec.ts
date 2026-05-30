import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageService } from 'primeng/api';
import { CoverLetterEditor } from './cover-letter-editor';
import { CoverLetterExportService } from '../../services/cover-letter-export.service';
import type { CoverLetterResult } from '@opticv/datatypes';

const MOCK_RESULT: CoverLetterResult = {
  salutation: 'Dear Hiring Manager,',
  signoff: 'Yours sincerely,',
  variants: [
    {
      hookType: 'achievement',
      fullLetter: 'First variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Narrative-driven',
      openingHook: 'Three years ago I shipped my first product...',
      closingCTA: 'I would love to discuss this further.',
      keywordsIncorporated: ['TypeScript', 'Angular'],
      bestFor: 'Startups and creative companies',
    },
    {
      hookType: 'insight',
      fullLetter: 'Second variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Value-led',
      openingHook: 'The biggest challenge in frontend today is...',
      closingCTA: 'Let us schedule a call.',
      keywordsIncorporated: ['NestJS'],
      bestFor: 'Enterprise and consulting roles',
    },
    {
      hookType: 'story',
      fullLetter: 'Third variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Confidence-led',
      openingHook: 'I have cut release cycles by 40% at every company I have joined.',
      closingCTA: 'I am ready to do the same for you.',
      keywordsIncorporated: [],
      bestFor: 'Senior and leadership positions',
    },
  ],
  recommendedVariant: 'insight',
  recommendationReason: 'This angle matches the company culture.',
  warnings: [],
};

const MOCK_RESULT_WITH_WARNINGS: CoverLetterResult = {
  ...MOCK_RESULT,
  warnings: ['Check word count', 'Review tone for target company'],
};

const MOCK_RESULT_SALUTATION_IN_LETTER: CoverLetterResult = {
  ...MOCK_RESULT,
  variants: MOCK_RESULT.variants.map((v, i) =>
    i === 1
      ? { ...v, fullLetter: `${MOCK_RESULT.salutation}\n\nSecond variant body text.` }
      : v,
  ),
};

const mockExportService = {
  exportToPdf: vi.fn().mockResolvedValue(undefined),
  exportToDocx: vi.fn().mockResolvedValue(undefined),
};

const mockMessageService = {
  add: vi.fn(),
};

describe('CoverLetterEditor', () => {
  let fixture: ComponentFixture<CoverLetterEditor>;
  let component: CoverLetterEditor;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [CoverLetterEditor],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CoverLetterExportService, useValue: mockExportService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoverLetterEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('renders all variant cards', () => {
    const articles = fixture.nativeElement.querySelectorAll('[role="article"]');
    expect(articles.length).toBe(MOCK_RESULT.variants.length);
  });

  it('shows "Recommended" badge only on the recommended variant card', () => {
    const articles: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="article"]');
    const recommendedIndex = MOCK_RESULT.variants.findIndex(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    const recommendedCard = articles[recommendedIndex];
    const otherCard = articles[0];

    expect(recommendedCard.textContent).toContain('Recommended');
    expect(otherCard.textContent).not.toContain('Recommended');
  });

  it('pre-selects the recommended variant on init', () => {
    const expectedIndex = MOCK_RESULT.variants.findIndex(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    expect(component.selectedVariantIndex()).toBe(expectedIndex);
  });

  it('pre-loads editor content with the recommended variant fullLetter wrapped in HTML', () => {
    const recommended = MOCK_RESULT.variants.find(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    const expectedHtml = `<p>${MOCK_RESULT.salutation}</p><p>${recommended!.fullLetter}</p>`;
    expect(component.editorContent()).toBe(expectedHtml);
  });

  it('updates selectedVariantIndex when selectVariant is called', () => {
    component.selectVariant(0);
    expect(component.selectedVariantIndex()).toBe(0);
  });

  it('updates editorContent to the selected variant fullLetter wrapped in HTML', () => {
    component.selectVariant(0);
    const expectedHtml = `<p>${MOCK_RESULT.salutation}</p><p>${MOCK_RESULT.variants[0].fullLetter}</p>`;
    expect(component.editorContent()).toBe(expectedHtml);
  });

  it('does not render warnings banner when warnings is empty', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Check word count');
  });

  it('renders warnings banner when warnings are present', () => {
    fixture.componentRef.setInput('result', MOCK_RESULT_WITH_WARNINGS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check word count');
    expect(fixture.nativeElement.textContent).toContain('Review tone for target company');
  });

  it('renders the recommendation reason', () => {
    expect(fixture.nativeElement.textContent).toContain(MOCK_RESULT.recommendationReason);
  });

  it('renders Export to PDF and Export to DOCX buttons enabled by default', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Export to PDF');
    expect(text).toContain('Export to DOCX');

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('p-button');
    const pdfButton = Array.from(buttons).find((b) => b.getAttribute('label') === 'Export to PDF');
    const docxButton = Array.from(buttons).find((b) => b.getAttribute('label') === 'Export to DOCX');
    expect(pdfButton?.getAttribute('ng-reflect-disabled')).not.toBe('true');
    expect(docxButton?.getAttribute('ng-reflect-disabled')).not.toBe('true');
    expect(pdfButton?.getAttribute('ptoolip')).toBeNull();
    expect(docxButton?.getAttribute('ptoolip')).toBeNull();
  });

  describe('salutation deduplication', () => {
    it('does not prepend salutation when fullLetter already starts with it', () => {
      fixture.componentRef.setInput('result', MOCK_RESULT_SALUTATION_IN_LETTER);
      fixture.detectChanges();

      const recommendedIndex = MOCK_RESULT_SALUTATION_IN_LETTER.variants.findIndex(
        (v) => v.hookType === MOCK_RESULT_SALUTATION_IN_LETTER.recommendedVariant,
      );
      component.selectVariant(recommendedIndex);

      const content = component.editorContent();
      const salutation = MOCK_RESULT_SALUTATION_IN_LETTER.salutation;
      const occurrences = content.split(salutation).length - 1;
      expect(occurrences).toBe(1);
    });

    it('prepends salutation when fullLetter does not start with it', () => {
      const content = component.editorContent();
      expect(content).toContain(MOCK_RESULT.salutation);
      const occurrences = content.split(MOCK_RESULT.salutation).length - 1;
      expect(occurrences).toBe(1);
    });
  });

  describe('export handlers', () => {
    it('calls exportService.exportToPdf with current editorContent', async () => {
      await component.onExportPdf();
      expect(mockExportService.exportToPdf).toHaveBeenCalledWith(component.editorContent());
    });

    it('calls exportService.exportToDocx with current editorContent', async () => {
      await component.onExportDocx();
      expect(mockExportService.exportToDocx).toHaveBeenCalledWith(component.editorContent());
    });

    it('shows error toast when exportToPdf throws', async () => {
      mockExportService.exportToPdf.mockRejectedValueOnce(new Error('fail'));
      await component.onExportPdf();
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Export failed' }),
      );
    });

    it('shows error toast when exportToDocx throws', async () => {
      mockExportService.exportToDocx.mockRejectedValueOnce(new Error('fail'));
      await component.onExportDocx();
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Export failed' }),
      );
    });

    it('resets isBusyPdf to false after export completes', async () => {
      await component.onExportPdf();
      expect(component.isBusyPdf()).toBe(false);
    });

    it('resets isBusyDocx to false after export completes', async () => {
      await component.onExportDocx();
      expect(component.isBusyDocx()).toBe(false);
    });

    it('resets isBusyPdf to false even when export throws', async () => {
      mockExportService.exportToPdf.mockRejectedValueOnce(new Error('fail'));
      await component.onExportPdf();
      expect(component.isBusyPdf()).toBe(false);
    });
  });
});
