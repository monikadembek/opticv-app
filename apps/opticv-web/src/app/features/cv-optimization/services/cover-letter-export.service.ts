import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  isBreak?: true;
}

interface ParagraphBlock {
  runs: InlineRun[];
}

@Injectable({ providedIn: 'root' })
export class CoverLetterExportService {
  private readonly platformId = inject(PLATFORM_ID);

  private parseHtml(html: string): ParagraphBlock[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks: ParagraphBlock[] = [];

    for (const p of Array.from(doc.body.querySelectorAll('p'))) {
      const runs: InlineRun[] = [];
      this.walkNode(p, false, false, runs);
      blocks.push({ runs });
    }

    return blocks;
  }

  private walkNode(
    node: Node,
    bold: boolean,
    italic: boolean,
    runs: InlineRun[],
  ): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) runs.push({ text, bold, italic });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      runs.push({ text: '', bold: false, italic: false, isBreak: true });
      return;
    }

    const nextBold = bold || tag === 'strong' || tag === 'b';
    const nextItalic = italic || tag === 'em' || tag === 'i';

    for (const child of Array.from(el.childNodes)) {
      this.walkNode(child, nextBold, nextItalic, runs);
    }
  }

  async exportToPdf(html: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginLeft = 56;
    const maxWidth = 503;
    const pageBottom = 782;
    const lineHeight = 14;
    const fontSize = 11;

    let y = 60;

    const checkPage = (): void => {
      if (y + lineHeight > pageBottom) {
        doc.addPage();
        y = 60;
      }
    };

    const fontStyle = (bold: boolean, italic: boolean): string => {
      if (bold && italic) return 'bolditalic';
      if (bold) return 'bold';
      if (italic) return 'italic';
      return 'normal';
    };

    const blocks = this.parseHtml(html);

    for (const block of blocks) {
      let x = marginLeft;

      for (const run of block.runs) {
        if (run.isBreak) {
          y += lineHeight;
          x = marginLeft;
          checkPage();
          continue;
        }

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle(run.bold, run.italic));

        const words = run.text.split(/(\s+)/);
        for (const token of words) {
          if (!token) continue;

          const isWhitespace = /^\s+$/.test(token);
          const tokenWidth = doc.getTextWidth(token);

          if (
            !isWhitespace &&
            x > marginLeft &&
            x + tokenWidth > marginLeft + maxWidth
          ) {
            y += lineHeight;
            x = marginLeft;
            checkPage();
          }

          if (!isWhitespace || x > marginLeft) {
            doc.text(token, x, y);
          }
          x += tokenWidth;
        }
      }

      y += lineHeight + 10;
      checkPage();
    }

    doc.save('cover-letter.pdf');
  }

  async exportToDocx(html: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { Document, Packer, Paragraph, TextRun } = await import('docx');

    type Para = InstanceType<typeof Paragraph>;

    const paragraphs: Para[] = [];

    const blocks = this.parseHtml(html);

    for (const block of blocks) {
      const children = block.runs.map((run) => {
        if (run.isBreak) {
          return new TextRun({ break: 1 });
        }
        return new TextRun({
          text: run.text,
          bold: run.bold,
          italics: run.italic,
          size: 24,
        });
      });

      paragraphs.push(new Paragraph({ children, spacing: { after: 160 } }));
      paragraphs.push(new Paragraph({ children: [] }));
    }

    const document = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(document);

    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'cover-letter.docx';
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
