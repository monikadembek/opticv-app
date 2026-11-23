import { FormControl } from '@angular/forms';
import {
  cvNameValidator,
  formatFileSize,
  getCvSource,
  getErrorMessage,
  getMimeLabel,
  getSourceLabel,
  isNearLimit,
  toExportFileName,
  usagePercent,
  validateCvName,
} from './utils';

const PDF = 'application/pdf';
const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});

describe('getMimeLabel', () => {
  it('should return "PDF" for application/pdf', () => {
    expect(getMimeLabel('application/pdf')).toBe('PDF');
  });

  it('should return "DOCX" for the Word document MIME type', () => {
    expect(
      getMimeLabel(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('DOCX');
  });

  it('should return the original MIME type for unknown types', () => {
    expect(getMimeLabel('image/png')).toBe('image/png');
    expect(getMimeLabel('text/plain')).toBe('text/plain');
    expect(getMimeLabel('')).toBe('');
  });
});

describe('usagePercent', () => {
  it('returns the used share of the limit as a percentage', () => {
    expect(usagePercent(0, 1)).toBe(0);
    expect(usagePercent(7, 10)).toBe(70);
    expect(usagePercent(1, 1)).toBe(100);
  });

  it('caps the value at 100 when usage exceeds the limit', () => {
    expect(usagePercent(6, 5)).toBe(100);
  });

  it('returns 0 when the limit is 0', () => {
    expect(usagePercent(0, 0)).toBe(0);
  });
});

describe('isNearLimit', () => {
  it('is false below 80% of the limit', () => {
    expect(isNearLimit(0, 1)).toBe(false);
    expect(isNearLimit(7, 10)).toBe(false);
    expect(isNearLimit(3, 5)).toBe(false);
  });

  it('is true at or above 80% of the limit', () => {
    expect(isNearLimit(8, 10)).toBe(true);
    expect(isNearLimit(4, 5)).toBe(true);
    expect(isNearLimit(1, 1)).toBe(true);
    expect(isNearLimit(6, 5)).toBe(true);
  });

  it('is false when the limit is 0', () => {
    expect(isNearLimit(0, 0)).toBe(false);
  });
});

describe('getSourceLabel', () => {
  it('returns "Built in app" when there is no MIME type', () => {
    expect(getSourceLabel({ mimeType: null })).toBe('Built in app');
  });

  it('returns the MIME label for uploaded files', () => {
    expect(getSourceLabel({ mimeType: PDF })).toBe('PDF');
    expect(getSourceLabel({ mimeType: DOCX })).toBe('DOCX');
  });
});

describe('getCvSource', () => {
  it('returns "built" when there is no MIME type', () => {
    expect(getCvSource({ mimeType: null })).toBe('built');
  });

  it('returns "pdf" for PDF files', () => {
    expect(getCvSource({ mimeType: PDF })).toBe('pdf');
  });

  it('returns "docx" for Word files', () => {
    expect(getCvSource({ mimeType: DOCX })).toBe('docx');
  });
});

describe('validateCvName', () => {
  it('returns "required" for empty or whitespace-only names', () => {
    expect(validateCvName('')).toBe('required');
    expect(validateCvName('   ')).toBe('required');
  });

  it('returns "maxlength" for names longer than 100 characters', () => {
    expect(validateCvName('a'.repeat(101))).toBe('maxlength');
  });

  it('accepts a name of exactly 100 characters', () => {
    expect(validateCvName('a'.repeat(100))).toBeNull();
  });

  it('trims before validating', () => {
    expect(validateCvName('  ok  ')).toBeNull();
    expect(validateCvName(` ${'a'.repeat(100)} `)).toBeNull();
  });
});

describe('cvNameValidator', () => {
  it('maps each validation result to an errors object', () => {
    expect(cvNameValidator(new FormControl(''))).toEqual({ required: true });
    expect(cvNameValidator(new FormControl('a'.repeat(101)))).toEqual({
      maxlength: true,
    });
    expect(cvNameValidator(new FormControl('Frontend CV'))).toBeNull();
  });
});

describe('getErrorMessage', () => {
  it('returns a string message', () => {
    expect(getErrorMessage({ error: { message: 'Nope' } }, 'fallback')).toBe(
      'Nope',
    );
  });

  it('joins an array of messages', () => {
    expect(
      getErrorMessage({ error: { message: ['a is bad', 'b is bad'] } }, 'f'),
    ).toBe('a is bad, b is bad');
  });

  it('returns the fallback when there is no message', () => {
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('toExportFileName', () => {
  it('keeps an ordinary name', () => {
    expect(toExportFileName('My Backend CV')).toBe('My Backend CV');
  });

  it('strips illegal characters and trims', () => {
    expect(toExportFileName('  CV: 2026/Q1  ')).toBe('CV 2026Q1');
    expect(toExportFileName('a\\b*c?"d<e>f|g')).toBe('abcdefg');
    expect(toExportFileName('Senior / Lead CV')).toBe('Senior Lead CV');
  });

  it('falls back to cv when nothing is left', () => {
    expect(toExportFileName('???')).toBe('cv');
    expect(toExportFileName('')).toBe('cv');
    expect(toExportFileName('   ')).toBe('cv');
  });

  it('removes leading and trailing dots', () => {
    expect(toExportFileName('..cv..')).toBe('cv');
    expect(toExportFileName('...')).toBe('cv');
  });

  it('removes control characters', () => {
    expect(toExportFileName('My\u0000CV\u0007')).toBe('MyCV');
  });

  it('collapses tabs and newlines into single spaces', () => {
    expect(toExportFileName('My\t\tBackend\nCV')).toBe('My Backend CV');
  });
});
