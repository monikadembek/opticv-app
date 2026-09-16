import type { jsPDF } from 'jspdf';
import { ROBOTO_FONT_BASE64 } from './roboto-font-base64';

export const PDF_FONT = 'Roboto';

/**
 * jsPDF's built-in "helvetica" is the Standard 14 PDF font restricted to
 * WinAnsi encoding, which has no glyphs for Polish characters (ą, ć, ę, ł,
 * ń, ó, ś, ź, ż). Registering Roboto gives full Latin Extended-A coverage.
 */
export function registerPdfFont(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_FONT_BASE64.regular);
  doc.addFont('Roboto-Regular.ttf', PDF_FONT, 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_FONT_BASE64.bold);
  doc.addFont('Roboto-Bold.ttf', PDF_FONT, 'bold');

  doc.addFileToVFS('Roboto-Italic.ttf', ROBOTO_FONT_BASE64.italic);
  doc.addFont('Roboto-Italic.ttf', PDF_FONT, 'italic');

  doc.addFileToVFS('Roboto-BoldItalic.ttf', ROBOTO_FONT_BASE64.boldItalic);
  doc.addFont('Roboto-BoldItalic.ttf', PDF_FONT, 'bolditalic');

  doc.setFont(PDF_FONT, 'normal');
}
