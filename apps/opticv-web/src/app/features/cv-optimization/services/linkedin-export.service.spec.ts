import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LinkedInExportService } from './linkedin-export.service';
import type { LinkedInRewriteResult } from '@opticv/datatypes';

const saveMock = vi.fn();
const addPageMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const textMock = vi.fn();
const splitTextToSizeMock = vi.fn((text: string) => [text]);

vi.mock('jspdf', () => {
  function jsPDF() {
    return {
      save: saveMock,
      addPage: addPageMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
      text: textMock,
      splitTextToSize: splitTextToSizeMock,
    };
  }
  return { jsPDF };
});

const toBlob = vi.fn().mockResolvedValue(new Blob(['docx']));

vi.mock('docx', () => {
  function Paragraph(opts: unknown) {
    return { _p: opts };
  }
  function TextRun(opts: unknown) {
    return { _r: opts };
  }
  function Document(opts: unknown) {
    return { _d: opts };
  }
  const Packer = { toBlob };
  const HeadingLevel = { TITLE: 'TITLE', HEADING_1: 'HEADING_1' };
  return { Document, Packer, Paragraph, TextRun, HeadingLevel };
});

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
      'Frontend engineer with 8 years delivering scalable Angular apps. I partner with product teams to ship reliable UIs. Open to senior IC roles.',
    characterCount: 140,
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
  skillsToAdd: ['TypeScript', 'RxJS'],
  targetSearchQueries: ['Angular developer', 'Frontend engineer remote'],
};

describe('LinkedInExportService (browser)', () => {
  let service: LinkedInExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    toBlob.mockResolvedValue(new Blob(['docx']));
    splitTextToSizeMock.mockImplementation((text: string) => [text]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(LinkedInExportService);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('exportToPdf', () => {
    it('resolves without throwing', async () => {
      await expect(service.exportToPdf(MOCK_RESULT)).resolves.toBeUndefined();
    });

    it('calls doc.save with linkedin-profile-suggestions.pdf', async () => {
      await service.exportToPdf(MOCK_RESULT);
      expect(saveMock).toHaveBeenCalledWith('linkedin-profile-suggestions.pdf');
    });

    it('renders headline variant text', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0]);
      expect(
        allTextArgs.some((t: unknown) =>
          typeof t === 'string' &&
          t.includes('Senior Frontend Engineer | Angular | Building Scalable UIs'),
        ),
      ).toBe(true);
    });

    it('marks the recommended headline with a star prefix', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(
        allTextArgs.some((t) => t.includes('★ Recommended')),
      ).toBe(true);
    });

    it('renders about section preview text', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(
        allTextArgs.some((t) =>
          t.includes('Frontend engineer with 8 years delivering scalable Angular apps.'),
        ),
      ).toBe(true);
    });

    it('renders skills to add when present', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(allTextArgs.some((t) => t.includes('TypeScript'))).toBe(true);
    });

    it('renders "None suggested" when skillsToAdd is empty', async () => {
      const result = { ...MOCK_RESULT, skillsToAdd: [] };
      await service.exportToPdf(result);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(allTextArgs.some((t) => t.includes('None suggested'))).toBe(true);
    });

    it('renders "None suggested" when skillsToAdd is undefined', async () => {
      const result = { ...MOCK_RESULT, skillsToAdd: undefined };
      await service.exportToPdf(result);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(allTextArgs.some((t) => t.includes('None suggested'))).toBe(true);
    });

    it('renders profile recommendations sorted by priority (high before low)', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      const highIdx = allTextArgs.findIndex((t) => t.includes('[HIGH]'));
      const lowIdx = allTextArgs.findIndex((t) => t.includes('[LOW]'));
      expect(highIdx).toBeGreaterThanOrEqual(0);
      expect(lowIdx).toBeGreaterThanOrEqual(0);
      expect(highIdx).toBeLessThan(lowIdx);
    });

    it('renders target search queries', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(
        allTextArgs.some((t) => t.includes('• Angular developer')),
      ).toBe(true);
    });

    it('renders keywords incorporated in about section when present', async () => {
      await service.exportToPdf(MOCK_RESULT);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(
        allTextArgs.some((t) => t.includes('Keywords incorporated: Angular, Frontend')),
      ).toBe(true);
    });

    it('skips keywords incorporated line when array is empty', async () => {
      const result = {
        ...MOCK_RESULT,
        aboutRewrite: { ...MOCK_RESULT.aboutRewrite, keywordsIncorporated: [] },
      };
      await service.exportToPdf(result);
      const allTextArgs = textMock.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(
        allTextArgs.some((t) => t.includes('Keywords incorporated:')),
      ).toBe(false);
    });

    it('adds a new page when content overflows', async () => {
      splitTextToSizeMock.mockImplementation((text: string) =>
        Array.from({ length: 80 }, () => text),
      );
      await service.exportToPdf(MOCK_RESULT);
      expect(addPageMock).toHaveBeenCalled();
    });
  });

  describe('exportToDocx', () => {
    it('resolves without throwing', async () => {
      await expect(service.exportToDocx(MOCK_RESULT)).resolves.toBeUndefined();
    });

    it('triggers anchor download with linkedin-profile-suggestions.docx', async () => {
      const clickSpy = vi.fn();
      const anchor = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;
      vi.spyOn(window.document.body, 'appendChild').mockImplementation(() => anchor);
      vi.spyOn(window.document.body, 'removeChild').mockImplementation(() => anchor);
      vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

      await service.exportToDocx(MOCK_RESULT);

      expect(anchor.download).toBe('linkedin-profile-suggestions.docx');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('calls Packer.toBlob to generate the document blob', async () => {
      await service.exportToDocx(MOCK_RESULT);
      expect(toBlob).toHaveBeenCalled();
    });

    it('revokes the object URL after download', async () => {
      const clickSpy = vi.fn();
      const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
      vi.spyOn(window.document.body, 'appendChild').mockImplementation(() => anchor);
      vi.spyOn(window.document.body, 'removeChild').mockImplementation(() => anchor);
      vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

      await service.exportToDocx(MOCK_RESULT);

      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });

    it('uses bullet paragraphs for skillsToAdd items', async () => {
      await service.exportToDocx(MOCK_RESULT);
      const docArg = toBlob.mock.calls[0][0] as {
        _d: { sections: Array<{ children: Array<Record<string, unknown>> }> };
      };
      const children = docArg._d.sections[0].children;
      // Each bullet() call produces a paragraph with a `bullet` key in the opts
      const hasBulletParagraph = children.some((c) => {
        const pOpts = c['_p'] as Record<string, unknown> | undefined;
        return pOpts?.['bullet'] !== undefined;
      });
      expect(hasBulletParagraph).toBe(true);
    });

    it('uses body paragraph for "None suggested" when skillsToAdd is empty', async () => {
      const result = { ...MOCK_RESULT, skillsToAdd: [] };
      await service.exportToDocx(result);
      expect(toBlob).toHaveBeenCalled();
    });

    it('renders recommendations sorted by priority (high before medium before low)', async () => {
      await service.exportToDocx(MOCK_RESULT);
      const docArg = toBlob.mock.calls[0][0] as {
        _d: { sections: Array<{ children: Array<Record<string, unknown>> }> };
      };
      const children = docArg._d.sections[0].children;
      // Each mixed() paragraph's _p opts has a `children` array of TextRun opts (_r)
      const runTexts = children
        .flatMap((c) => {
          const pOpts = c['_p'] as Record<string, unknown> | undefined;
          const runs = pOpts?.['children'] as Array<Record<string, unknown>> | undefined;
          return runs ?? [];
        })
        .map((r) => {
          const rOpts = r['_r'] as Record<string, unknown> | undefined;
          return rOpts?.['text'] as string | undefined;
        })
        .filter(Boolean) as string[];
      const highIdx = runTexts.findIndex((t) => t.includes('[HIGH]'));
      const lowIdx = runTexts.findIndex((t) => t.includes('[LOW]'));
      expect(highIdx).toBeGreaterThanOrEqual(0);
      expect(lowIdx).toBeGreaterThanOrEqual(0);
      expect(highIdx).toBeLessThan(lowIdx);
    });
  });
});

describe('LinkedInExportService (server)', () => {
  let service: LinkedInExportService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(LinkedInExportService);
  });

  it('exportToPdf returns early on server without throwing', async () => {
    await expect(service.exportToPdf(MOCK_RESULT)).resolves.toBeUndefined();
  });

  it('exportToDocx returns early on server without throwing', async () => {
    await expect(service.exportToDocx(MOCK_RESULT)).resolves.toBeUndefined();
  });
});
