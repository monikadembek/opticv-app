import {
  formatFileSize,
  getMimeLabel,
  isNearLimit,
  usagePercent,
} from './utils';

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
