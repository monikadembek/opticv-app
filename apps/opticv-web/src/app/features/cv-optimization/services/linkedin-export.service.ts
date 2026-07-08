import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  LinkedInHeadlineAngle,
  LinkedInProfileRecommendation,
  LinkedInRecommendationSection,
  LinkedInRewriteResult,
  RecommendedSkill,
} from '@opticv/datatypes';
import { PDF_FONT, registerPdfFont } from './fonts/register-pdf-font';

export const LINKEDIN_ANGLE_LABELS: Record<LinkedInHeadlineAngle, string> = {
  title_specialty_value: 'Title / Specialty / Value',
  outcome_focused: 'Outcome-Focused',
  story_focused: 'Story-Focused',
};

export const LINKEDIN_SECTION_LABELS: Record<
  LinkedInRecommendationSection,
  string
> = {
  skills: 'Skills',
  featured: 'Featured Section',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  url: 'Custom URL',
  photo: 'Profile Photo',
  banner: 'Background Banner',
  recommendations: 'Recommendations',
  activity: 'Activity & Posts',
};

const PRIORITY_ORDER: Record<
  LinkedInProfileRecommendation['priority'],
  number
> = { high: 0, medium: 1, low: 2 };

@Injectable({ providedIn: 'root' })
export class LinkedInExportService {
  private readonly platformId = inject(PLATFORM_ID);

  async exportToPdf(result: LinkedInRewriteResult): Promise<void> {
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
    addWrappedText('LinkedIn Profile Suggestions', 16, true, false, 12);

    // Section 1: Headline Variants
    addSectionTitle('Headline Variants');
    for (const variant of result.headlineVariants) {
      const isRecommended = result.recommendedHeadline === variant.angle;
      const angleLabel = LINKEDIN_ANGLE_LABELS[variant.angle] ?? variant.angle;
      const prefix = isRecommended ? '★ Recommended — ' : '';
      addWrappedText(`${prefix}${angleLabel}`, 10, true, false);
      addWrappedText(variant.text, 11, false, false, 4);
      addWrappedText(`${variant.characterCount} / 220 chars`, 9, false, false);
      if (variant.keywordsTargeted.length > 0) {
        addWrappedText(
          `Keywords: ${variant.keywordsTargeted.join(', ')}`,
          9,
          false,
          true,
          4,
        );
      }
      if (variant.rationale) {
        addWrappedText(variant.rationale, 9, false, false, 4);
      }
      y += 8;
    }

    // Section 2: About Section
    addSectionTitle('About Section');
    addWrappedText('Preview (visible before "See more")', 10, true, false, 2);
    addWrappedText(result.aboutRewrite.preview, 10, false, true, 8);
    addWrappedText('Full text', 10, true, false, 2);
    addWrappedText(result.aboutRewrite.fullText, 10, false, false, 4);
    addWrappedText(
      `${result.aboutRewrite.characterCount} / 2600 chars`,
      9,
      false,
      false,
      4,
    );
    if (result.aboutRewrite.keywordsIncorporated?.length) {
      addWrappedText(
        `Keywords incorporated: ${result.aboutRewrite.keywordsIncorporated.join(', ')}`,
        9,
        false,
        true,
        4,
      );
    }
    y += 8;

    // Section 3: Recommended LinkedIn Skills
    addSectionTitle('Recommended LinkedIn Skills');
    const skills = result.recommendedSkills ?? [];
    if (skills.length > 0) {
      addWrappedText(
        skills
          .map((s: RecommendedSkill) => (s.isNew ? `${s.name} (new)` : s.name))
          .join(', '),
        10,
        false,
        false,
        8,
      );
    } else {
      addWrappedText('No skills recommended', 10, false, false, 8);
    }

    // Section 4: Profile Recommendations
    addSectionTitle('Profile Recommendations');
    const sorted = [...result.additionalRecommendations].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
    for (const rec of sorted) {
      const sectionLabel = LINKEDIN_SECTION_LABELS[rec.section] ?? rec.section;
      addWrappedText(
        `[${rec.priority.toUpperCase()}] ${sectionLabel}: ${rec.recommendation}`,
        10,
        false,
        false,
        6,
      );
    }
    y += 8;

    // Section 5: Target Search Queries
    addSectionTitle('Target Search Queries');
    for (const query of result.targetSearchQueries) {
      addWrappedText(`• ${query}`, 10, false, false, 4);
    }

    doc.save('linkedin-profile-suggestions.pdf');
  }

  async exportToDocx(result: LinkedInRewriteResult): Promise<void> {
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
        text: 'LinkedIn Profile Suggestions',
        heading: HeadingLevel.TITLE,
      }),
    );
    paragraphs.push(spacer());

    // Section 1: Headline Variants
    paragraphs.push(heading1('Headline Variants'));
    for (const variant of result.headlineVariants) {
      const isRecommended = result.recommendedHeadline === variant.angle;
      const angleLabel = LINKEDIN_ANGLE_LABELS[variant.angle] ?? variant.angle;
      const prefix = isRecommended ? '★ Recommended — ' : '';
      paragraphs.push(bold(`${prefix}${angleLabel}`));
      paragraphs.push(body(variant.text));
      paragraphs.push(
        mixed({ text: `${variant.characterCount} / 220 chars`, italics: true }),
      );
      if (variant.keywordsTargeted.length > 0) {
        paragraphs.push(
          italic(`Keywords: ${variant.keywordsTargeted.join(', ')}`),
        );
      }
      if (variant.rationale) {
        paragraphs.push(body(variant.rationale));
      }
      paragraphs.push(spacer());
    }

    // Section 2: About Section
    paragraphs.push(heading1('About Section'));
    paragraphs.push(bold('Preview (visible before "See more")'));
    paragraphs.push(italic(result.aboutRewrite.preview));
    paragraphs.push(spacer());
    paragraphs.push(bold('Full text'));
    paragraphs.push(body(result.aboutRewrite.fullText));
    paragraphs.push(
      italic(`${result.aboutRewrite.characterCount} / 2600 chars`),
    );
    if (result.aboutRewrite.keywordsIncorporated?.length) {
      paragraphs.push(
        italic(
          `Keywords incorporated: ${result.aboutRewrite.keywordsIncorporated.join(', ')}`,
        ),
      );
    }
    paragraphs.push(spacer());

    // Section 3: Recommended LinkedIn Skills
    paragraphs.push(heading1('Recommended LinkedIn Skills'));
    const skills = result.recommendedSkills ?? [];
    if (skills.length > 0) {
      for (const s of skills) {
        paragraphs.push(bullet(s.isNew ? `${s.name} (new)` : s.name));
      }
    } else {
      paragraphs.push(body('No skills recommended'));
    }
    paragraphs.push(spacer());

    // Section 4: Profile Recommendations
    paragraphs.push(heading1('Profile Recommendations'));
    const sorted = [...result.additionalRecommendations].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
    for (const rec of sorted) {
      const sectionLabel = LINKEDIN_SECTION_LABELS[rec.section] ?? rec.section;
      paragraphs.push(
        mixed(
          { text: `[${rec.priority.toUpperCase()}] `, bold: true },
          { text: `${sectionLabel}: ${rec.recommendation}` },
        ),
      );
      paragraphs.push(spacer());
    }

    // Section 5: Target Search Queries
    paragraphs.push(heading1('Target Search Queries'));
    for (const query of result.targetSearchQueries) {
      paragraphs.push(bullet(query));
    }

    const document = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(document);

    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = 'linkedin-profile-suggestions.docx';
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
