import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CoverLetterExportService } from './cover-letter-export.service';

const saveMock = vi.fn();
const getTextWidthMock = vi.fn().mockReturnValue(10);
const addPageMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const textMock = vi.fn();
const addFileToVFSMock = vi.fn();
const addFontMock = vi.fn();

vi.mock('jspdf', () => {
  function jsPDF() {
    return {
      save: saveMock,
      getTextWidth: getTextWidthMock,
      addPage: addPageMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
      text: textMock,
      addFileToVFS: addFileToVFSMock,
      addFont: addFontMock,
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
  return { Document, Packer, Paragraph, TextRun, HeadingLevel: {} };
});

describe('CoverLetterExportService (browser)', () => {
  let service: CoverLetterExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    toBlob.mockResolvedValue(new Blob(['docx']));
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(CoverLetterExportService);

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('exportToPdf resolves without throwing for empty html', async () => {
    await expect(service.exportToPdf('')).resolves.toBeUndefined();
  });

  it('exportToDocx resolves without throwing for empty html', async () => {
    await expect(service.exportToDocx('')).resolves.toBeUndefined();
  });

  it('exportToPdf calls doc.save with cover-letter.pdf', async () => {
    await service.exportToPdf('<p>Hello world</p>');
    expect(saveMock).toHaveBeenCalledWith('cover-letter.pdf');
  });

  it('exportToDocx triggers anchor download with cover-letter.docx', async () => {
    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(window.document.body, 'appendChild').mockImplementation(() => anchor);
    vi.spyOn(window.document.body, 'removeChild').mockImplementation(() => anchor);
    vi.spyOn(window.document, 'createElement').mockReturnValue(anchor);

    await service.exportToDocx('<p>Hello</p>');

    expect(anchor.download).toBe('cover-letter.docx');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportToPdf sets bold font style for <strong> run', async () => {
    await service.exportToPdf('<p><strong>Bold</strong> text</p>');
    const fontCalls = setFontMock.mock.calls as string[][];
    expect(fontCalls.some((c) => c[1] === 'bold')).toBe(true);
    expect(fontCalls.some((c) => c[1] === 'normal')).toBe(true);
  });

  it('exportToPdf sets italic font style for <em> run', async () => {
    await service.exportToPdf('<p><em>Italic</em></p>');
    const fontCalls = setFontMock.mock.calls as string[][];
    expect(fontCalls.some((c) => c[1] === 'italic')).toBe(true);
  });

  it('exportToPdf handles multiple paragraphs without throwing', async () => {
    await expect(
      service.exportToPdf('<p>First</p><p>Second</p>'),
    ).resolves.toBeUndefined();
  });

  it('exportToPdf advances y for <br> inside a paragraph', async () => {
    await service.exportToPdf('<p>Line one<br>Line two</p>');
    expect(textMock).toHaveBeenCalled();
    const calls = textMock.mock.calls as Array<[string, number, number]>;
    const yValues = calls.map((c) => c[2]);
    expect(new Set(yValues).size).toBeGreaterThan(1);
  });

  it('exportToDocx produces a TextRun with break:1 for <br> inside a paragraph', async () => {
    await service.exportToDocx('<p>Line one<br>Line two</p>');
    const docxModule = await import('docx');
    // TextRun mock returns its opts object; Paragraph receives the array of those objects.
    // Packer.toBlob receives the Document which wraps the paragraphs.
    // The mock TextRun returns opts as-is, so we inspect toBlob call args.
    const docArg = toBlob.mock.calls[0][0] as { sections: Array<{ children: Array<{ children: unknown[] }> }> };
    const allChildren = docArg.sections[0].children.flatMap((p) => p.children ?? []);
    expect(allChildren.some((c) => (c as Record<string, unknown>)['break'] === 1)).toBe(true);
    void docxModule;
  });
});

describe('CoverLetterExportService (server)', () => {
  let service: CoverLetterExportService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(CoverLetterExportService);
  });

  it('exportToPdf returns early on server without throwing', async () => {
    await expect(service.exportToPdf('<p>Hello</p>')).resolves.toBeUndefined();
  });

  it('exportToDocx returns early on server without throwing', async () => {
    await expect(service.exportToDocx('<p>Hello</p>')).resolves.toBeUndefined();
  });
});
