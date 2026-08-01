import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { CvStructuredData } from '@opticv/datatypes';
import { CvExportService } from './cv-export.service';
import type { CvTemplateId } from '../cv-templates';

const saveMock = vi.fn();
const getTextWidthMock = vi.fn().mockReturnValue(10);
const addPageMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const textMock = vi.fn();
const splitTextToSizeMock = vi.fn((text: string) => [text]);
const rectMock = vi.fn();
const roundedRectMock = vi.fn();
const lineMock = vi.fn();
const setFillColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setTextColorMock = vi.fn();
const setLineWidthMock = vi.fn();
const addFileToVFSMock = vi.fn();
const addFontMock = vi.fn();
const getNumberOfPagesMock = vi.fn().mockReturnValue(1);
const setPageMock = vi.fn();

vi.mock('jspdf', () => {
  function jsPDF() {
    return {
      save: saveMock,
      getTextWidth: getTextWidthMock,
      addPage: addPageMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
      text: textMock,
      splitTextToSize: splitTextToSizeMock,
      rect: rectMock,
      roundedRect: roundedRectMock,
      line: lineMock,
      setFillColor: setFillColorMock,
      setDrawColor: setDrawColorMock,
      setTextColor: setTextColorMock,
      setLineWidth: setLineWidthMock,
      addFileToVFS: addFileToVFSMock,
      addFont: addFontMock,
      getNumberOfPages: getNumberOfPagesMock,
      setPage: setPageMock,
    };
  }
  return { jsPDF };
});

const toBlob = vi.fn().mockResolvedValue(new Blob(['docx']));

vi.mock('docx', () => {
  function Paragraph(opts: unknown) {
    return opts;
  }
  function TextRun(opts: unknown) {
    return opts;
  }
  function Document(opts: unknown) {
    return opts;
  }
  const Packer = { toBlob };
  return {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel: { HEADING_2: 'HEADING_2' },
    AlignmentType: { LEFT: 'left', RIGHT: 'right', CENTER: 'center' },
    BorderStyle: { SINGLE: 'single' },
    ShadingType: { SOLID: 'solid' },
    TabStopType: { RIGHT: 'right' },
  };
});

const ALL_TEMPLATE_IDS: CvTemplateId[] = [
  'default',
  'classic',
  'modern',
  'corporate',
  'minimal',
  'impact',
];

// Templates where setTextColor is called with the accent RGB in PDF export
const PDF_ACCENT_TEXT_COLOR_IDS: CvTemplateId[] = [
  'default',
  'modern',
  'impact',
];
// Templates where accentAware=true and accentHex appears in docx TextRun color fields
const DOCX_ACCENT_COLOR_IDS: CvTemplateId[] = [
  'default',
  'modern',
  'corporate',
  'impact',
];
const MONOCHROME_IDS: CvTemplateId[] = ['classic', 'minimal'];

const makeCv = (): CvStructuredData => ({
  contact: {
    name: 'Jane Doe',
    position: 'Senior Software Engineer',
    email: 'jane@example.com',
    phone: '555-1234',
    location: 'Remote',
    linkedin: null,
    website: null,
  },
  summary: 'Experienced engineer.',
  experience: [
    {
      title: 'Engineer',
      company: 'Acme',
      location: 'Remote',
      startDate: '2020',
      endDate: null,
      current: true,
      bullets: ['Did things'],
    },
  ],
  education: [
    {
      degree: 'BSc',
      institution: 'University',
      location: null,
      startDate: '2016',
      endDate: '2020',
      field: 'CS',
    },
  ],
  skills: ['TypeScript', 'Angular'],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
  gdprClause: null,
});

describe('CvExportService (browser)', () => {
  let service: CvExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    toBlob.mockResolvedValue(new Blob(['docx']));
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(CvExportService);

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('exportToPdf', () => {
    it.each(ALL_TEMPLATE_IDS)(
      'resolves without throwing for template %s',
      async (id) => {
        await expect(
          service.exportToPdf(makeCv(), id),
        ).resolves.toBeUndefined();
      },
    );

    it('saves the file as optimized-cv.pdf', async () => {
      await service.exportToPdf(makeCv(), 'default');
      expect(saveMock).toHaveBeenCalledWith('optimized-cv.pdf');
    });

    it('defaults to the default template and emerald accent color', async () => {
      await expect(service.exportToPdf(makeCv())).resolves.toBeUndefined();
    });

    it.each(PDF_ACCENT_TEXT_COLOR_IDS)(
      'applies the given accentColor RGB as text color for template %s',
      async (id) => {
        await service.exportToPdf(makeCv(), id, '#2563eb');
        // #2563eb -> 37, 99, 235
        expect(setTextColorMock).toHaveBeenCalledWith(37, 99, 235);
      },
    );

    it.each(MONOCHROME_IDS)(
      'ignores the given accentColor for monochrome template %s',
      async (id) => {
        await service.exportToPdf(makeCv(), id, '#2563eb');
        expect(setTextColorMock).not.toHaveBeenCalledWith(37, 99, 235);
      },
    );

    it('renders the gdprClause text when present', async () => {
      const cv = { ...makeCv(), gdprClause: 'I consent to data processing.' };
      await service.exportToPdf(cv, 'default');
      expect(splitTextToSizeMock).toHaveBeenCalledWith(
        'I consent to data processing.',
        expect.any(Number),
      );
    });

    it('does not render a gdprClause block when null', async () => {
      const cv = { ...makeCv(), gdprClause: null };
      await service.exportToPdf(cv, 'default');
      expect(splitTextToSizeMock).not.toHaveBeenCalledWith(
        expect.stringContaining('consent'),
        expect.any(Number),
      );
    });
  });

  describe('exportToDocx', () => {
    it.each(ALL_TEMPLATE_IDS)(
      'resolves without throwing for template %s',
      async (id) => {
        const clickSpy = vi.fn();
        const anchor = {
          href: '',
          download: '',
          click: clickSpy,
        } as unknown as HTMLAnchorElement;
        vi.spyOn(window.document.body, 'appendChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document.body, 'removeChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

        await expect(
          service.exportToDocx(makeCv(), id),
        ).resolves.toBeUndefined();
      },
    );

    it('triggers anchor download with optimized-cv.docx', async () => {
      const clickSpy = vi.fn();
      const anchor = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement;
      vi.spyOn(window.document.body, 'appendChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document.body, 'removeChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

      await service.exportToDocx(makeCv(), 'default');

      expect(anchor.download).toBe('optimized-cv.docx');
      expect(clickSpy).toHaveBeenCalled();
    });

    it.each(DOCX_ACCENT_COLOR_IDS)(
      'applies the given accentColor hex for accent-aware template %s',
      async (id) => {
        const anchor = {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
        vi.spyOn(window.document.body, 'appendChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document.body, 'removeChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

        await service.exportToDocx(makeCv(), id, '#2563eb');

        const docArg = toBlob.mock.calls[0][0] as {
          sections: Array<{
            children: Array<{ children?: Array<{ color?: string }> }>;
          }>;
        };
        const allRuns = docArg.sections[0].children.flatMap(
          (p) => p.children ?? [],
        );
        expect(allRuns.some((r) => r.color === '2563EB')).toBe(true);
      },
    );

    it.each(MONOCHROME_IDS)(
      'ignores the given accentColor for monochrome template %s',
      async (id) => {
        const anchor = {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
        vi.spyOn(window.document.body, 'appendChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document.body, 'removeChild').mockImplementation(
          () => anchor,
        );
        vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

        await service.exportToDocx(makeCv(), id, '#2563eb');

        const docArg = toBlob.mock.calls[0][0] as {
          sections: Array<{
            children: Array<{ children?: Array<{ color?: string }> }>;
          }>;
        };
        const allRuns = docArg.sections[0].children.flatMap(
          (p) => p.children ?? [],
        );
        expect(allRuns.some((r) => r.color === '2563EB')).toBe(false);
      },
    );

    it('includes the gdprClause paragraph when present', async () => {
      const anchor = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      vi.spyOn(window.document.body, 'appendChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document.body, 'removeChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

      const cv = { ...makeCv(), gdprClause: 'I consent to data processing.' };
      await service.exportToDocx(cv, 'default');

      const docArg = toBlob.mock.calls[0][0] as {
        sections: Array<{
          children: Array<{
            children?: Array<{ text?: string; italics?: boolean }>;
          }>;
        }>;
      };
      const allRuns = docArg.sections[0].children.flatMap(
        (p) => p.children ?? [],
      );
      const gdprRun = allRuns.find(
        (r) => r.text === 'I consent to data processing.',
      );
      expect(gdprRun).toBeTruthy();
      expect(gdprRun?.italics).toBe(true);
    });

    it('does not include a gdprClause paragraph when null', async () => {
      const anchor = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      vi.spyOn(window.document.body, 'appendChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document.body, 'removeChild').mockImplementation(
        () => anchor,
      );
      vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

      const cv = { ...makeCv(), gdprClause: null };
      await service.exportToDocx(cv, 'default');

      const docArg = toBlob.mock.calls[0][0] as {
        sections: Array<{
          children: Array<{ children?: Array<{ text?: string }> }>;
        }>;
      };
      const allRuns = docArg.sections[0].children.flatMap(
        (p) => p.children ?? [],
      );
      expect(allRuns.some((r) => r.text?.includes('consent'))).toBe(false);
    });
  });
});

describe('CvExportService (server)', () => {
  let service: CvExportService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(CvExportService);
  });

  it('exportToPdf returns early on server without throwing', async () => {
    await expect(
      service.exportToPdf(makeCv(), 'default'),
    ).resolves.toBeUndefined();
  });

  it('exportToDocx returns early on server without throwing', async () => {
    await expect(
      service.exportToDocx(makeCv(), 'default'),
    ).resolves.toBeUndefined();
  });
});
