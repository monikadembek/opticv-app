import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { CvStructuredData } from '@opticv/datatypes';
import { CvTemplateId, DEFAULT_ACCENT_COLOR } from '../cv-templates';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

function hexToRgbProfile(
  hex: string,
): Pick<PdfStyleProfile, 'accentR' | 'accentG' | 'accentB'> {
  const { r, g, b } = hexToRgb(hex);
  return { accentR: r, accentG: g, accentB: b };
}

interface PdfStyleProfile {
  accentAware: boolean;
  accentR: number;
  accentG: number;
  accentB: number;
  nameSize: number;
  headingSize: number;
  bodySize: number;
  contactSize: number;
  contactAlign: 'left' | 'right-block';
  nameAlign: 'left' | 'center';
  headerBand: boolean;
  headingStyle: 'underline' | 'leftBar' | 'filledBand';
  skillsStyle: 'chips' | 'comma';
  chipsStyle: 'outlined' | 'filled';
  entryCardStyle: boolean;
  accentBullet: boolean;
  nameFont: string;
  nameStyle: 'normal' | 'bold' | 'italic' | 'bolditalic';
  headingFont: string;
  bodyFont: string;
  bodyStyle: 'normal' | 'bold' | 'italic' | 'bolditalic';
  dateStyle: 'normal' | 'bold' | 'italic' | 'bolditalic';
}

interface DocxStyleProfile {
  accentAware: boolean;
  accentHex: string;
  nameHex: string;
  nameSize: number;
  headingSize: number;
  bodySize: number;
  contactSize: number;
  nameCenter: boolean;
  contactCenter: boolean;
  contactRightStack: boolean;
  skillsStyle: 'chips' | 'comma';
  nameFont: string;
  nameBold: boolean;
  nameItalic: boolean;
  headingFont: string;
  headingBold: boolean;
  bodyFont: string;
}

const PDF_PROFILES: Record<CvTemplateId, PdfStyleProfile> = {
  bold: {
    accentAware: true,
    accentR: 230, accentG: 57, accentB: 70,
    nameSize: 20, headingSize: 12, bodySize: 10, contactSize: 9,
    contactAlign: 'right-block', nameAlign: 'left', headerBand: false,
    headingStyle: 'leftBar', skillsStyle: 'chips', chipsStyle: 'outlined',
    entryCardStyle: false, accentBullet: true,
    nameFont: 'helvetica', nameStyle: 'bold',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'italic',
  },
  classic: {
    accentAware: false,
    accentR: 30, accentG: 41, accentB: 59,
    nameSize: 20, headingSize: 12, bodySize: 10, contactSize: 9,
    contactAlign: 'left', nameAlign: 'left', headerBand: false,
    headingStyle: 'underline', skillsStyle: 'comma', chipsStyle: 'outlined',
    entryCardStyle: false, accentBullet: false,
    nameFont: 'helvetica', nameStyle: 'bold',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'italic',
  },
  modern: {
    accentAware: true,
    accentR: 5, accentG: 150, accentB: 105,
    nameSize: 20, headingSize: 12, bodySize: 10, contactSize: 9,
    contactAlign: 'left', nameAlign: 'left', headerBand: false,
    headingStyle: 'underline', skillsStyle: 'chips', chipsStyle: 'outlined',
    entryCardStyle: false, accentBullet: true,
    nameFont: 'helvetica', nameStyle: 'bold',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'italic',
  },
  corporate: {
    accentAware: true,
    accentR: 5, accentG: 150, accentB: 105,
    nameSize: 18, headingSize: 11, bodySize: 10, contactSize: 9,
    contactAlign: 'left', nameAlign: 'left', headerBand: true,
    headingStyle: 'leftBar', skillsStyle: 'chips', chipsStyle: 'filled',
    entryCardStyle: false, accentBullet: false,
    nameFont: 'helvetica', nameStyle: 'bold',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'normal',
  },
  minimal: {
    accentAware: false,
    accentR: 100, accentG: 116, accentB: 139,
    nameSize: 20, headingSize: 9, bodySize: 10, contactSize: 9,
    contactAlign: 'left', nameAlign: 'center', headerBand: false,
    headingStyle: 'underline', skillsStyle: 'comma', chipsStyle: 'outlined',
    entryCardStyle: false, accentBullet: false,
    nameFont: 'helvetica', nameStyle: 'normal',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'normal',
  },
  impact: {
    accentAware: true,
    accentR: 5, accentG: 150, accentB: 105,
    nameSize: 22, headingSize: 11, bodySize: 10, contactSize: 9,
    contactAlign: 'left', nameAlign: 'left', headerBand: false,
    headingStyle: 'filledBand', skillsStyle: 'chips', chipsStyle: 'filled',
    entryCardStyle: false, accentBullet: true,
    nameFont: 'helvetica', nameStyle: 'bold',
    headingFont: 'helvetica',
    bodyFont: 'helvetica', bodyStyle: 'normal',
    dateStyle: 'normal',
  },
};

const DOCX_PROFILES: Record<CvTemplateId, DocxStyleProfile> = {
  bold: {
    accentAware: true,
    accentHex: 'E63946', nameHex: '1A1A1A',
    nameSize: 40, headingSize: 24, bodySize: 20, contactSize: 18,
    nameCenter: false, contactCenter: false, contactRightStack: true,
    skillsStyle: 'chips',
    nameFont: 'helvetica', nameBold: true, nameItalic: false,
    headingFont: 'helvetica', headingBold: true,
    bodyFont: 'helvetica',
  },
  classic: {
    accentAware: false,
    accentHex: '1E293B', nameHex: '1E293B',
    nameSize: 40, headingSize: 24, bodySize: 20, contactSize: 18,
    nameCenter: false, contactCenter: false, contactRightStack: false,
    skillsStyle: 'comma',
    nameFont: 'helvetica', nameBold: true, nameItalic: false,
    headingFont: 'helvetica', headingBold: true,
    bodyFont: 'helvetica',
  },
  modern: {
    accentAware: true,
    accentHex: '059669', nameHex: '0F172A',
    nameSize: 40, headingSize: 24, bodySize: 20, contactSize: 18,
    nameCenter: false, contactCenter: false, contactRightStack: false,
    skillsStyle: 'chips',
    nameFont: 'helvetica', nameBold: true, nameItalic: false,
    headingFont: 'helvetica', headingBold: true,
    bodyFont: 'helvetica',
  },
  corporate: {
    accentAware: true,
    accentHex: '059669', nameHex: '0F172A',
    nameSize: 36, headingSize: 22, bodySize: 20, contactSize: 18,
    nameCenter: false, contactCenter: false, contactRightStack: false,
    skillsStyle: 'chips',
    nameFont: 'helvetica', nameBold: true, nameItalic: false,
    headingFont: 'helvetica', headingBold: true,
    bodyFont: 'helvetica',
  },
  minimal: {
    accentAware: false,
    accentHex: '64748B', nameHex: '1E293B',
    nameSize: 40, headingSize: 18, bodySize: 20, contactSize: 18,
    nameCenter: true, contactCenter: true, contactRightStack: false,
    skillsStyle: 'comma',
    nameFont: 'helvetica', nameBold: false, nameItalic: false,
    headingFont: 'helvetica', headingBold: false,
    bodyFont: 'helvetica',
  },
  impact: {
    accentAware: true,
    accentHex: '059669', nameHex: '0F172A',
    nameSize: 44, headingSize: 22, bodySize: 20, contactSize: 18,
    nameCenter: false, contactCenter: false, contactRightStack: false,
    skillsStyle: 'chips',
    nameFont: 'helvetica', nameBold: true, nameItalic: false,
    headingFont: 'helvetica', headingBold: true,
    bodyFont: 'helvetica',
  },
};

@Injectable({ providedIn: 'root' })
export class CvExportService {
  private readonly platformId = inject(PLATFORM_ID);

  async exportToPdf(
    cv: CvStructuredData,
    templateId: CvTemplateId = 'bold',
    accentColor: string = DEFAULT_ACCENT_COLOR,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { jsPDF } = await import('jspdf');
    const baseProfile = PDF_PROFILES[templateId];
    const profile = baseProfile.accentAware
      ? { ...baseProfile, ...hexToRgbProfile(accentColor) }
      : baseProfile;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginLeft = 56;
    const marginRight = 56;
    const pageWidth = 595;
    const maxWidth = pageWidth - marginLeft - marginRight;
    const pageBottom = 800;
    let y = 60;

    const setAccent = (): void => {
      doc.setTextColor(profile.accentR, profile.accentG, profile.accentB);
    };
    const setBlack = (): void => {
      doc.setTextColor(26, 26, 26);
    };
    const setGrey = (): void => {
      doc.setTextColor(100, 100, 100);
    };

    const checkPage = (needed = 14): void => {
      if (y + needed > pageBottom) {
        doc.addPage();
        y = 60;
      }
    };

    const addSectionHeading = (text: string): void => {
      checkPage(24);
      const label = text.toUpperCase();

      if (profile.headingStyle === 'underline') {
        setAccent();
        doc.setFontSize(profile.headingSize);
        doc.setFont(profile.headingFont, 'bold');
        doc.text(label, marginLeft, y);
        y += 4;
        doc.setDrawColor(profile.accentR, profile.accentG, profile.accentB);
        doc.setLineWidth(0.8);
        doc.line(marginLeft, y, pageWidth - marginRight, y);
        y += 14;
        setBlack();
      } else if (profile.headingStyle === 'leftBar') {
        doc.setFillColor(profile.accentR, profile.accentG, profile.accentB);
        doc.rect(marginLeft - 6, y - 11, 3, 13, 'F');
        setAccent();
        doc.setFontSize(profile.headingSize);
        doc.setFont(profile.headingFont, 'bold');
        doc.text(label, marginLeft + 2, y);
        y += 16;
        setBlack();
      } else {
        // filledBand (impact)
        doc.setFillColor(profile.accentR, profile.accentG, profile.accentB);
        doc.rect(marginLeft - 10, y - 12, maxWidth + 20, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(profile.headingSize);
        doc.setFont(profile.headingFont, 'bold');
        doc.text(label, marginLeft, y);
        y += 16;
        setBlack();
      }
    };

    const addWrappedText = (
      text: string,
      fontSize: number,
      style: string,
      indent = 0,
      xOverride?: number,
      alignRight = false,
    ): void => {
      doc.setFontSize(fontSize);
      doc.setFont(profile.bodyFont, style);
      const usableWidth = maxWidth - indent;
      const lines = doc.splitTextToSize(text, usableWidth);
      for (const line of lines) {
        checkPage();
        if (alignRight) {
          const lineWidth = doc.getTextWidth(line as string);
          doc.text(line as string, pageWidth - marginRight - lineWidth, y);
        } else {
          doc.text(line as string, xOverride ?? marginLeft + indent, y);
        }
        y += fontSize * 1.4;
      }
    };

    const addBullet = (text: string, accentBullet = false): void => {
      const indent = 14;
      const bulletChar = '• ';
      doc.setFontSize(profile.bodySize);

      if (accentBullet) {
        setAccent();
        doc.setFont(profile.bodyFont, 'normal');
        doc.text(bulletChar, marginLeft + indent - 8, y);
        setBlack();
        const lines = doc.splitTextToSize(text, maxWidth - indent - 8);
        for (let i = 0; i < lines.length; i++) {
          checkPage();
          doc.text(lines[i] as string, marginLeft + indent, i === 0 ? y : y);
          if (i < lines.length - 1) y += 14;
        }
        y += 14;
      } else {
        doc.setFont(profile.bodyFont, 'normal');
        setBlack();
        const bulletLines = doc.splitTextToSize(
          `${bulletChar}${text}`,
          maxWidth - indent,
        );
        for (const line of bulletLines) {
          checkPage();
          doc.text(line as string, marginLeft + indent, y);
          y += 14;
        }
      }
    };

    const addSkillChips = (skills: string[]): void => {
      const chipPadH = 6;
      const chipPadV = 2;
      const chipHeight = profile.bodySize + chipPadV * 2 + 2;
      const gap = 6;
      let x = marginLeft;
      checkPage(chipHeight + 4);

      for (const skill of skills) {
        doc.setFontSize(profile.bodySize);
        doc.setFont('helvetica', 'normal');
        const textWidth = doc.getTextWidth(skill);
        const chipWidth = textWidth + chipPadH * 2;

        if (x + chipWidth > pageWidth - marginRight) {
          x = marginLeft;
          y += chipHeight + gap;
          checkPage(chipHeight + 4);
        }

        doc.setDrawColor(profile.accentR, profile.accentG, profile.accentB);
        doc.setLineWidth(0.5);

        if (profile.chipsStyle === 'filled') {
          doc.setFillColor(profile.accentR, profile.accentG, profile.accentB);
          doc.roundedRect(
            x,
            y - profile.bodySize + 1,
            chipWidth,
            chipHeight,
            2,
            2,
            'FD',
          );
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(
            x,
            y - profile.bodySize + 1,
            chipWidth,
            chipHeight,
            6,
            6,
            'FD',
          );
          setAccent();
        }

        doc.text(skill, x + chipPadH, y + chipPadV);
        setBlack();
        x += chipWidth + gap;
      }
      y += chipHeight + 8;
    };

    // ── Contact / Header ────────────────────────────────────────────────────

    if (profile.nameAlign === 'center') {
      if (cv.contact.name) {
        setAccent();
        doc.setFontSize(profile.nameSize);
        doc.setFont(profile.nameFont, profile.nameStyle);
        checkPage(28);
        doc.text(cv.contact.name, pageWidth / 2, y, { align: 'center' });
        y += 26;
        setBlack();
      }

      const contactParts = [
        cv.contact.email,
        cv.contact.phone,
        cv.contact.location,
        cv.contact.linkedin,
        cv.contact.website,
      ].filter(Boolean) as string[];
      if (contactParts.length > 0) {
        setGrey();
        doc.setFontSize(profile.contactSize);
        doc.setFont(profile.bodyFont, 'normal');
        const line = contactParts.join('  |  ');
        const wrapped = doc.splitTextToSize(line, maxWidth);
        for (const l of wrapped) {
          checkPage();
          doc.text(l as string, pageWidth / 2, y, { align: 'center' });
          y += 13;
        }
        setBlack();
      }
      y += 8;
    } else if (profile.contactAlign === 'right-block') {
      // Modern: name left, contact right
      const contactParts = [
        cv.contact.email,
        cv.contact.phone,
        cv.contact.location,
        cv.contact.linkedin,
      ].filter(Boolean) as string[];

      const nameY = y;
      if (cv.contact.name) {
        setBlack();
        doc.setFontSize(profile.nameSize);
        doc.setFont(profile.nameFont, profile.nameStyle);
        checkPage(28);
        doc.text(cv.contact.name, marginLeft, y);
      }

      let rightY = nameY;
      setGrey();
      doc.setFontSize(profile.contactSize);
      doc.setFont(profile.bodyFont, 'normal');
      for (const part of contactParts) {
        const w = doc.getTextWidth(part);
        doc.text(part, pageWidth - marginRight - w, rightY);
        rightY += 13;
      }
      setBlack();
      y = Math.max(y + 26, rightY) + 8;
    } else {
      // Classic / Corporate / Minimal-fallback: simple left-aligned, optional header band
      if (profile.headerBand) {
        const contactLineCount = [
          cv.contact.email,
          cv.contact.phone,
          cv.contact.location,
          cv.contact.linkedin,
          cv.contact.website,
        ].filter(Boolean).length;
        const bandHeight = 26 + (contactLineCount > 0 ? 13 : 0) + 14;
        doc.setFillColor(241, 245, 249);
        doc.rect(marginLeft - 10, y - 18, maxWidth + 20, bandHeight, 'F');
        doc.setDrawColor(profile.accentR, profile.accentG, profile.accentB);
        doc.setLineWidth(1.5);
        doc.line(
          marginLeft - 10,
          y - 18 + bandHeight,
          marginLeft - 10 + maxWidth + 20,
          y - 18 + bandHeight,
        );
      }

      if (cv.contact.name) {
        setBlack();
        doc.setFontSize(profile.nameSize);
        doc.setFont(profile.nameFont, profile.nameStyle);
        checkPage(28);
        doc.text(cv.contact.name, marginLeft, y);
        y += 26;
      }
      const contactParts = [
        cv.contact.email,
        cv.contact.phone,
        cv.contact.location,
        cv.contact.linkedin,
        cv.contact.website,
      ].filter(Boolean) as string[];
      if (contactParts.length > 0) {
        setGrey();
        doc.setFontSize(profile.contactSize);
        doc.setFont(profile.bodyFont, 'normal');
        const line = contactParts.join('  |  ');
        const wrapped = doc.splitTextToSize(line, maxWidth);
        for (const l of wrapped) {
          checkPage();
          doc.text(l as string, marginLeft, y);
          y += 13;
        }
        setBlack();
      }
      y += profile.headerBand ? 16 : 8;
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    if (cv.summary) {
      addSectionHeading('Summary');
      addWrappedText(cv.summary, profile.bodySize, 'normal');
      y += 8;
    }

    // ── Experience ───────────────────────────────────────────────────────────
    if (cv.experience.length > 0) {
      addSectionHeading('Experience');
      for (const exp of cv.experience) {
        checkPage(20);

        if (profile.entryCardStyle) {
          doc.setDrawColor(233, 213, 255);
          doc.setLineWidth(2.5);
          doc.line(marginLeft - 4, y - 10, marginLeft - 4, y + 4);
        }

        const titleLine = [exp.title, exp.company].filter(Boolean).join(' — ');
        doc.setFontSize(profile.bodySize);
        doc.setFont(profile.bodyFont, 'bold');
        setBlack();
        doc.text(titleLine, marginLeft, y);

        const dateStr = exp.current
          ? `${exp.startDate ?? ''} – Present`
          : [exp.startDate, exp.endDate].filter(Boolean).join(' – ');

        if (dateStr.trim()) {
          setGrey();
          doc.setFontSize(profile.contactSize);
          doc.setFont(profile.bodyFont, profile.dateStyle);
          const dw = doc.getTextWidth(dateStr);
          doc.text(dateStr, pageWidth - marginRight - dw, y);
          setBlack();
        }
        y += 13;

        if (exp.location) {
          setGrey();
          addWrappedText(exp.location, 9, 'italic');
          setBlack();
        }

        for (const bullet of exp.bullets) {
          addBullet(bullet, profile.accentBullet);
        }
        y += 6;
      }
    }

    // ── Education ────────────────────────────────────────────────────────────
    if (cv.education.length > 0) {
      addSectionHeading('Education');
      for (const edu of cv.education) {
        checkPage(16);

        if (profile.entryCardStyle) {
          doc.setDrawColor(233, 213, 255);
          doc.setLineWidth(2.5);
          doc.line(marginLeft - 4, y - 10, marginLeft - 4, y + 4);
        }

        const line = [edu.degree, edu.field].filter(Boolean).join(', ');
        if (line) addWrappedText(line, profile.bodySize, 'bold');
        if (edu.institution)
          addWrappedText(edu.institution, profile.bodySize, 'normal');
        const dateStr = [edu.startDate, edu.endDate]
          .filter(Boolean)
          .join(' – ');
        if (dateStr) {
          setGrey();
          addWrappedText(dateStr, 9, 'italic');
          setBlack();
        }
        y += 6;
      }
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    if (cv.skills.length > 0) {
      addSectionHeading('Skills');
      if (profile.skillsStyle === 'comma') {
        addWrappedText(cv.skills.join(', '), profile.bodySize, 'normal');
        y += 8;
      } else {
        addSkillChips(cv.skills);
      }
    }

    // ── Certifications ───────────────────────────────────────────────────────
    if (cv.certifications.length > 0) {
      addSectionHeading('Certifications');
      for (const cert of cv.certifications) {
        const parts = [cert.name, cert.issuer, cert.date]
          .filter(Boolean)
          .join(' · ');
        addWrappedText(parts, profile.bodySize, 'normal');
      }
      y += 8;
    }

    // ── Projects ─────────────────────────────────────────────────────────────
    if (cv.projects.length > 0) {
      addSectionHeading('Projects');
      for (const proj of cv.projects) {
        checkPage(16);
        addWrappedText(proj.name, profile.bodySize, 'bold');
        if (proj.description)
          addWrappedText(proj.description, profile.bodySize, 'normal');
        if (proj.technologies.length > 0) {
          setGrey();
          addWrappedText(proj.technologies.join(', '), 9, 'italic');
          setBlack();
        }
        y += 4;
      }
    }

    // ── Languages ────────────────────────────────────────────────────────────
    if (cv.languages.length > 0) {
      addSectionHeading('Languages');
      const langLine = cv.languages
        .map((l) =>
          l.proficiency ? `${l.language} (${l.proficiency})` : l.language,
        )
        .join(', ');
      addWrappedText(langLine, profile.bodySize, 'normal');
    }

    doc.save('optimized-cv.pdf');
  }

  async exportToDocx(
    cv: CvStructuredData,
    templateId: CvTemplateId = 'bold',
    accentColor: string = DEFAULT_ACCENT_COLOR,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const {
      AlignmentType,
      Document,
      HeadingLevel,
      Packer,
      Paragraph,
      TextRun,
    } = await import('docx');

    type Para = InstanceType<typeof Paragraph>;
    const baseProfile = DOCX_PROFILES[templateId];
    const accentHex = accentColor.replace('#', '').toUpperCase();
    const profile = baseProfile.accentAware
      ? { ...baseProfile, accentHex }
      : baseProfile;
    const children: Para[] = [];

    const heading = (text: string): Para =>
      new Paragraph({
        children: [
          new TextRun({
            text: text.toUpperCase(),
            bold: profile.headingBold,
            font: profile.headingFont,
            size: profile.headingSize,
            color: profile.accentHex,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        alignment: AlignmentType.LEFT,
      });

    const para = (
      text: string,
      bold = false,
      italic = false,
      size = profile.bodySize,
      color = '1A1A1A',
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
    ): Para =>
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            italics: italic,
            font: profile.bodyFont,
            size,
            color,
          }),
        ],
        spacing: { after: 60 },
        alignment: align,
      });

    const bullet = (text: string): Para =>
      new Paragraph({
        text,
        bullet: { level: 0 },
        spacing: { after: 40 },
      });

    const contactAlign = profile.nameCenter
      ? AlignmentType.CENTER
      : AlignmentType.LEFT;

    // ── Contact ──────────────────────────────────────────────────────────────
    if (cv.contact.name) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cv.contact.name,
              bold: profile.nameBold,
              italics: profile.nameItalic,
              font: profile.nameFont,
              size: profile.nameSize,
              color: profile.nameHex,
            }),
          ],
          spacing: { after: 80 },
          alignment: contactAlign,
        }),
      );
    }

    const contactParts = [
      cv.contact.email,
      cv.contact.phone,
      cv.contact.location,
      cv.contact.linkedin,
      cv.contact.website,
    ].filter(Boolean) as string[];

    if (profile.contactRightStack) {
      for (const part of contactParts) {
        children.push(
          para(part, false, false, 18, '666666', AlignmentType.RIGHT),
        );
      }
    } else if (contactParts.length > 0) {
      children.push(
        para(
          contactParts.join('  |  '),
          false,
          false,
          18,
          '666666',
          contactAlign,
        ),
      );
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    if (cv.summary) {
      children.push(heading('Summary'));
      children.push(para(cv.summary));
    }

    // ── Experience ───────────────────────────────────────────────────────────
    if (cv.experience.length > 0) {
      children.push(heading('Experience'));
      for (const exp of cv.experience) {
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
              '666666',
            ),
          );
        }

        for (const b of exp.bullets) {
          children.push(bullet(b));
        }
      }
    }

    // ── Education ────────────────────────────────────────────────────────────
    if (cv.education.length > 0) {
      children.push(heading('Education'));
      for (const edu of cv.education) {
        const line = [edu.degree, edu.field].filter(Boolean).join(', ');
        if (line) children.push(para(line, true));
        if (edu.institution) children.push(para(edu.institution));
        const dateStr = [edu.startDate, edu.endDate]
          .filter(Boolean)
          .join(' – ');
        if (dateStr) children.push(para(dateStr, false, true, 18, '666666'));
      }
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    if (cv.skills.length > 0) {
      children.push(heading('Skills'));
      children.push(
        para(
          cv.skills.join(', '),
          false,
          false,
          profile.bodySize,
          profile.accentHex,
        ),
      );
    }

    // ── Certifications ───────────────────────────────────────────────────────
    if (cv.certifications.length > 0) {
      children.push(heading('Certifications'));
      for (const cert of cv.certifications) {
        const parts = [cert.name, cert.issuer, cert.date]
          .filter(Boolean)
          .join(' · ');
        children.push(para(parts));
      }
    }

    // ── Projects ─────────────────────────────────────────────────────────────
    if (cv.projects.length > 0) {
      children.push(heading('Projects'));
      for (const proj of cv.projects) {
        children.push(para(proj.name, true));
        if (proj.description) children.push(para(proj.description));
        if (proj.technologies.length > 0) {
          children.push(
            para(proj.technologies.join(', '), false, true, 18, '666666'),
          );
        }
      }
    }

    // ── Languages ────────────────────────────────────────────────────────────
    if (cv.languages.length > 0) {
      children.push(heading('Languages'));
      const langLine = cv.languages
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
}
