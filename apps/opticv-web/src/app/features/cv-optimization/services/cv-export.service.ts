import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { AppliedEdits, CvStructuredData } from '@opticv/datatypes';

@Injectable({ providedIn: 'root' })
export class CvExportService {
  private readonly platformId = inject(PLATFORM_ID);

  async exportToPdf(cv: CvStructuredData, edits: AppliedEdits): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { jsPDF } = await import('jspdf');
    const merged = this.mergeCv(cv, edits);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginLeft = 56;
    const marginRight = 56;
    const pageWidth = 595;
    const maxWidth = pageWidth - marginLeft - marginRight;
    const pageBottom = 800;
    let y = 60;

    const checkPage = (needed = 14): void => {
      if (y + needed > pageBottom) {
        doc.addPage();
        y = 60;
      }
    };

    const addSectionHeading = (text: string): void => {
      checkPage(24);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(text.toUpperCase(), marginLeft, y);
      y += 4;
      doc.setLineWidth(0.5);
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      y += 14;
    };

    const addWrappedText = (
      text: string,
      fontSize: number,
      style: string,
      indent = 0,
    ): void => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        checkPage();
        doc.text(line as string, marginLeft + indent, y);
        y += fontSize * 1.4;
      }
    };

    const addBullet = (text: string): void => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const indent = 14;
      const bulletLines = doc.splitTextToSize(`• ${text}`, maxWidth - indent);
      for (const line of bulletLines) {
        checkPage();
        doc.text(line as string, marginLeft + indent, y);
        y += 14;
      }
    };

    // Contact
    if (merged.contact.name) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      checkPage(24);
      doc.text(merged.contact.name, marginLeft, y);
      y += 24;
    }

    const contactParts = [
      merged.contact.email,
      merged.contact.phone,
      merged.contact.location,
      merged.contact.linkedin,
      merged.contact.website,
    ].filter(Boolean) as string[];

    if (contactParts.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      checkPage();
      const contactLine = contactParts.join('  |  ');
      const wrapped = doc.splitTextToSize(contactLine, maxWidth);
      for (const line of wrapped) {
        doc.text(line as string, marginLeft, y);
        y += 13;
      }
    }
    y += 8;

    // Summary
    if (merged.summary) {
      addSectionHeading('Summary');
      addWrappedText(merged.summary, 10, 'normal');
      y += 8;
    }

    // Experience
    if (merged.experience.length > 0) {
      addSectionHeading('Experience');
      for (const exp of merged.experience) {
        checkPage(20);
        const titleLine = [exp.title, exp.company].filter(Boolean).join(' — ');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(titleLine, marginLeft, y);

        const dateStr = exp.current
          ? `${exp.startDate ?? ''} – Present`
          : [exp.startDate, exp.endDate].filter(Boolean).join(' – ');

        if (dateStr.trim()) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const dateWidth = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageWidth - marginRight - dateWidth, y);
        }
        y += 13;

        if (exp.location) {
          addWrappedText(exp.location, 9, 'italic');
        }

        for (const bullet of exp.bullets) {
          addBullet(bullet);
        }
        y += 6;
      }
    }

    // Education
    if (merged.education.length > 0) {
      addSectionHeading('Education');
      for (const edu of merged.education) {
        checkPage(16);
        const line = [edu.degree, edu.field].filter(Boolean).join(', ');
        if (line) addWrappedText(line, 10, 'bold');
        if (edu.institution) addWrappedText(edu.institution, 10, 'normal');
        const dateStr = [edu.startDate, edu.endDate]
          .filter(Boolean)
          .join(' – ');
        if (dateStr) addWrappedText(dateStr, 9, 'italic');
        y += 6;
      }
    }

    // Skills
    if (merged.skills.length > 0) {
      addSectionHeading('Skills');
      addWrappedText(merged.skills.join(', '), 10, 'normal');
      y += 8;
    }

    // Certifications
    if (merged.certifications.length > 0) {
      addSectionHeading('Certifications');
      for (const cert of merged.certifications) {
        const parts = [cert.name, cert.issuer, cert.date]
          .filter(Boolean)
          .join(' · ');
        addWrappedText(parts, 10, 'normal');
      }
      y += 8;
    }

    // Projects
    if (merged.projects.length > 0) {
      addSectionHeading('Projects');
      for (const proj of merged.projects) {
        checkPage(16);
        addWrappedText(proj.name, 10, 'bold');
        if (proj.description) addWrappedText(proj.description, 10, 'normal');
        if (proj.technologies.length > 0) {
          addWrappedText(proj.technologies.join(', '), 9, 'italic');
        }
        y += 4;
      }
    }

    // Languages
    if (merged.languages.length > 0) {
      addSectionHeading('Languages');
      const langLine = merged.languages
        .map((l) =>
          l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
        )
        .join(', ');
      addWrappedText(langLine, 10, 'normal');
    }

    doc.save('optimized-cv.pdf');
  }

  async exportToDocx(cv: CvStructuredData, edits: AppliedEdits): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { Document, HeadingLevel, Packer, Paragraph, TextRun } =
      await import('docx');
    type Para = InstanceType<typeof Paragraph>;
    const merged = this.mergeCv(cv, edits);
    const children: Para[] = [];

    const heading = (text: string): Para =>
      new Paragraph({
        text: text.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      });

    const para = (
      text: string,
      bold = false,
      italic = false,
      size = 20,
    ): Para =>
      new Paragraph({
        children: [new TextRun({ text, bold, italics: italic, size })],
        spacing: { after: 60 },
      });

    const bullet = (text: string): Para =>
      new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 40 } });

    // Contact
    if (merged.contact.name) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: merged.contact.name, bold: true, size: 36 }),
          ],
          spacing: { after: 80 },
        }),
      );
    }

    const contactParts = [
      merged.contact.email,
      merged.contact.phone,
      merged.contact.location,
      merged.contact.linkedin,
      merged.contact.website,
    ].filter(Boolean) as string[];

    if (contactParts.length > 0) {
      children.push(para(contactParts.join('  |  '), false, false, 18));
    }

    // Summary
    if (merged.summary) {
      children.push(heading('Summary'));
      children.push(para(merged.summary));
    }

    // Experience
    if (merged.experience.length > 0) {
      children.push(heading('Experience'));
      for (const exp of merged.experience) {
        const titleLine = [exp.title, exp.company].filter(Boolean).join(' — ');
        if (titleLine) children.push(para(titleLine, true));

        const dateStr = exp.current
          ? `${exp.startDate ?? ''} – Present`
          : [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
        if (exp.location || dateStr.trim()) {
          children.push(
            para(
              [exp.location, dateStr].filter(Boolean).join('  ·  '),
              false,
              true,
              18,
            ),
          );
        }

        for (const b of exp.bullets) {
          children.push(bullet(b));
        }
      }
    }

    // Education
    if (merged.education.length > 0) {
      children.push(heading('Education'));
      for (const edu of merged.education) {
        const line = [edu.degree, edu.field].filter(Boolean).join(', ');
        if (line) children.push(para(line, true));
        if (edu.institution) children.push(para(edu.institution));
        const dateStr = [edu.startDate, edu.endDate]
          .filter(Boolean)
          .join(' – ');
        if (dateStr) children.push(para(dateStr, false, true, 18));
      }
    }

    // Skills
    if (merged.skills.length > 0) {
      children.push(heading('Skills'));
      children.push(para(merged.skills.join(', ')));
    }

    // Certifications
    if (merged.certifications.length > 0) {
      children.push(heading('Certifications'));
      for (const cert of merged.certifications) {
        const parts = [cert.name, cert.issuer, cert.date]
          .filter(Boolean)
          .join(' · ');
        children.push(para(parts));
      }
    }

    // Projects
    if (merged.projects.length > 0) {
      children.push(heading('Projects'));
      for (const proj of merged.projects) {
        children.push(para(proj.name, true));
        if (proj.description) children.push(para(proj.description));
        if (proj.technologies.length > 0) {
          children.push(para(proj.technologies.join(', '), false, true, 18));
        }
      }
    }

    // Languages
    if (merged.languages.length > 0) {
      children.push(heading('Languages'));
      const langLine = merged.languages
        .map((l) =>
          l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
        )
        .join(', ');
      children.push(para(langLine));
    }

    const document = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(document);

    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'optimized-cv.docx';
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private mergeCv(cv: CvStructuredData, edits: AppliedEdits): CvStructuredData {
    const summary = edits.summary ?? cv.summary;

    const skills = [...cv.skills];
    if (edits.keywordsText) {
      const newKeywords = edits.keywordsText
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean);
      const existing = new Set(skills.map((s) => s.toLowerCase()));
      for (const kw of newKeywords) {
        if (!existing.has(kw.toLowerCase())) {
          skills.push(kw);
          existing.add(kw.toLowerCase());
        }
      }
    }

    const experience = cv.experience.map((exp, pi) => {
      const bullets = exp.bullets.map((b, bi) => {
        const applied = edits.bullets.find(
          (ab) => ab.positionIndex === pi && ab.bulletIndex === bi,
        );
        return applied ? applied.text : b;
      });
      return { ...exp, bullets };
    });

    return { ...cv, summary, skills, experience };
  }
}
