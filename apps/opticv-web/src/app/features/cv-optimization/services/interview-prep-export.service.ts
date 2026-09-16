import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { InterviewPrepResult } from '@opticv/datatypes';
import { PDF_FONT, registerPdfFont } from './fonts/register-pdf-font';

@Injectable({ providedIn: 'root' })
export class InterviewPrepExportService {
  private readonly platformId = inject(PLATFORM_ID);

  async exportToPdf(result: InterviewPrepResult): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    registerPdfFont(doc);

    const marginLeft = 40;
    const maxWidth = 515;
    const pageBottom = 780;
    const lineHeight = 14;

    let y = 50;

    const checkPage = (neededHeight: number): void => {
      if (y + neededHeight > pageBottom) {
        doc.addPage();
        y = 50;
      }
    };

    const addWrappedText = (
      text: string,
      fontSize: number,
      bold: boolean,
      italic: boolean,
      extraSpacingAfter = 0,
    ): void => {
      doc.setFontSize(fontSize);
      doc.setFont(
        PDF_FONT,
        bold && italic
          ? 'bolditalic'
          : bold
            ? 'bold'
            : italic
              ? 'italic'
              : 'normal',
      );
      const lines = doc.splitTextToSize(text, maxWidth) as string[];
      for (const line of lines) {
        checkPage(lineHeight);
        doc.text(line, marginLeft, y);
        y += lineHeight;
      }
      y += extraSpacingAfter;
    };

    const addSectionTitle = (title: string): void => {
      y += 6;
      checkPage(20);
      doc.setFontSize(13);
      doc.setFont(PDF_FONT, 'bold');
      doc.text(title, marginLeft, y);
      y += 18;
    };

    // Document title
    addWrappedText('Interview Preparation', 16, true, false, 12);

    // Section 1: Interview Questions
    addSectionTitle('Interview Questions');

    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];

      let headerLine = `Q${i + 1}  Category: ${q.category.replace('_', ' ')}`;
      if (q.likelihood)
        headerLine += `  Likelihood: ${q.likelihood.replace('_', ' ')}`;
      addWrappedText(headerLine, 10, true, false);

      addWrappedText(q.question, 11, true, false, 10);
      addWrappedText(
        `Assessing: ${q.whatTheyreAssessing}`,
        10,
        false,
        true,
        10,
      );
      addWrappedText(
        `[Answer structure: ${q.answerStructure}]`,
        10,
        false,
        false,
      );
      addWrappedText(q.suggestedAnswer, 10, false, false, 10);

      if (q.needsUserInput && q.placeholdersToFill.length > 0) {
        addWrappedText(
          `Fill in: ${q.placeholdersToFill.join(', ')}`,
          9,
          false,
          false,
          10,
        );
      }

      if (q.trapsToAvoid.length > 0) {
        addWrappedText('Traps to avoid:', 10, true, false);
        for (const trap of q.trapsToAvoid) {
          addWrappedText(`- ${trap}`, 9, false, false);
        }
        y += 10;
      }

      if (q.followUps.length > 0) {
        addWrappedText('Follow-up questions:', 10, true, false);
        for (const fu of q.followUps) {
          addWrappedText(`Q: ${fu.followUpQuestion}`, 9, true, false);
          addWrappedText(`Guidance: ${fu.guidance}`, 9, false, false, 1);
        }
      }

      y += 20;
    }

    // Section 2: Questions to Ask Interviewer
    if (result.questionsToAskInterviewer.length > 0) {
      addSectionTitle('Questions to Ask Interviewer');
      for (let i = 0; i < result.questionsToAskInterviewer.length; i++) {
        const q = result.questionsToAskInterviewer[i];
        addWrappedText(`${i + 1}. ${q.question}`, 10, true, false, 2);
        addWrappedText(q.rationale, 10, false, false, 6);
      }

      y += 20;
    }

    // Section 3: Stress-Test Questions
    if (result.stressTestQuestions.length > 0) {
      addSectionTitle('Stress-Test Questions');
      for (const st of result.stressTestQuestions) {
        addWrappedText(st.question, 11, true, false, 4);
        addWrappedText(st.whyItllComeUp, 10, false, true, 4);
        addWrappedText(st.recommendedAnswer, 10, false, false, 10);
      }

      y += 20;
    }

    // Section 4: Preparation Tips
    if (result.preparationTips.length > 0) {
      addSectionTitle('Preparation Tips');
      for (const tip of result.preparationTips) {
        addWrappedText(`• ${tip}`, 10, false, false, 4);
      }
    }

    doc.save('interview-prep.pdf');
  }

  async exportToDocx(result: InterviewPrepResult): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
      await import('docx');

    type Para = InstanceType<typeof Paragraph>;

    const paragraphs: Para[] = [];

    const heading1 = (text: string) =>
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200, before: 150 },
      });

    const heading2 = (text: string) =>
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200, before: 100 },
      });

    const body = (text: string) =>
      new Paragraph({ children: [new TextRun({ text, size: 22 })] });

    const bold = (text: string) =>
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22 })],
      });

    const italic = (text: string) =>
      new Paragraph({
        children: [new TextRun({ text, italics: true, size: 22 })],
      });

    const mixed = (...runs: ConstructorParameters<typeof TextRun>[0][]) =>
      new Paragraph({
        children: runs.map(
          (r) =>
            new TextRun(
              typeof r === 'string'
                ? { text: r, size: 22 }
                : { size: 22, ...r },
            ),
        ),
      });

    const bullet = (text: string) =>
      new Paragraph({
        children: [new TextRun({ text, size: 22 })],
        bullet: { level: 0 },
      });

    const spacer = () => new Paragraph({ children: [] });

    // Document title
    paragraphs.push(
      new Paragraph({
        text: 'Interview Preparation',
        heading: HeadingLevel.TITLE,
      }),
    );
    paragraphs.push(spacer());

    // Section 1: Interview Questions
    paragraphs.push(heading1('Interview Questions'));
    paragraphs.push(spacer());

    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];

      const headerParts: ConstructorParameters<typeof TextRun>[0][] = [
        { text: `Q${i + 1}  `, bold: true },
        { text: `Category: ${q.category.replace('_', ' ')}`, bold: true },
      ];
      if (q.likelihood)
        headerParts.push({
          text: `  Likelihood: ${q.likelihood.replace('_', ' ')}`,
        });
      paragraphs.push(mixed(...headerParts));

      paragraphs.push(heading2(q.question));
      paragraphs.push(italic(`Assessing: ${q.whatTheyreAssessing}`));
      paragraphs.push(spacer());
      paragraphs.push(
        mixed(
          { text: `[Answer structure: ${q.answerStructure}]  `, bold: true },
          { text: q.suggestedAnswer },
        ),
      );
      paragraphs.push(spacer());

      if (q.needsUserInput && q.placeholdersToFill.length > 0) {
        paragraphs.push(body(`Fill in: ${q.placeholdersToFill.join(', ')}`));
        paragraphs.push(spacer());
      }

      if (q.trapsToAvoid.length > 0) {
        paragraphs.push(bold('Traps to avoid:'));
        for (const trap of q.trapsToAvoid) {
          paragraphs.push(bullet(trap));
        }
        paragraphs.push(spacer());
      }

      if (q.followUps.length > 0) {
        paragraphs.push(bold('Follow-up questions:'));
        paragraphs.push(spacer());
        for (const fu of q.followUps) {
          paragraphs.push(
            mixed({ text: 'Q: ', bold: true }, { text: fu.followUpQuestion }),
          );
          paragraphs.push(italic(`Guidance: ${fu.guidance}`));
          paragraphs.push(spacer());
        }
      }

      paragraphs.push(spacer());
      paragraphs.push(spacer());
    }

    // Section 2: Questions to Ask Interviewer
    if (result.questionsToAskInterviewer.length > 0) {
      paragraphs.push(heading1('Questions to Ask Interviewer'));
      for (let i = 0; i < result.questionsToAskInterviewer.length; i++) {
        const q = result.questionsToAskInterviewer[i];
        paragraphs.push(bold(`${i + 1}. ${q.question}`));
        paragraphs.push(body(q.rationale));
        paragraphs.push(spacer());
      }
      paragraphs.push(spacer());
    }

    // Section 3: Stress-Test Questions
    if (result.stressTestQuestions.length > 0) {
      paragraphs.push(heading1('Stress-Test Questions'));
      for (const st of result.stressTestQuestions) {
        paragraphs.push(heading2(st.question));
        paragraphs.push(italic(st.whyItllComeUp));
        paragraphs.push(spacer());
        paragraphs.push(body(st.recommendedAnswer));
        paragraphs.push(spacer());
      }
      paragraphs.push(spacer());
    }

    // Section 4: Preparation Tips
    if (result.preparationTips.length > 0) {
      paragraphs.push(heading1('Preparation Tips'));
      for (const tip of result.preparationTips) {
        paragraphs.push(bullet(tip));
      }
    }

    const document = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(document);

    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'interview-prep.docx';
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
