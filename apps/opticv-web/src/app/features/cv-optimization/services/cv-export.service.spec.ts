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

const ACCENT_AWARE_IDS: CvTemplateId[] = [
  'default',
  'modern',
  'corporate',
  'impact',
];
const MONOCHROME_IDS: CvTemplateId[] = ['classic', 'minimal'];

const makeCv = (): CvStructuredData => ({
  contact: {
    name: 'Jane Doe',
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

    it.each(ACCENT_AWARE_IDS)(
      'applies the given accentColor RGB for accent-aware template %s',
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

    it.each(ACCENT_AWARE_IDS)(
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
