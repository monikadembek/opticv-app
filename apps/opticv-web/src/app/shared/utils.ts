import type { ValidatorFn } from '@angular/forms';
import { CV_NAME_MAX_LENGTH, type CvDocumentListItem } from '@opticv/datatypes';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
};

export function getMimeLabel(mimeType: string): string {
  return MIME_LABELS[mimeType] ?? mimeType;
}

export type CvSource = 'pdf' | 'docx' | 'built';

export function getCvSource(
  file: Pick<CvDocumentListItem, 'mimeType'>,
): CvSource {
  if (file.mimeType === null) return 'built';
  return getMimeLabel(file.mimeType) === 'PDF' ? 'pdf' : 'docx';
}

export function getSourceLabel(
  file: Pick<CvDocumentListItem, 'mimeType'>,
): string {
  return file.mimeType === null ? 'Built in app' : getMimeLabel(file.mimeType);
}

export type CvNameError = 'required' | 'maxlength';

export function validateCvName(value: string): CvNameError | null {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return 'required';
  if (trimmed.length > CV_NAME_MAX_LENGTH) return 'maxlength';
  return null;
}

export const cvNameValidator: ValidatorFn = (control) => {
  const error = validateCvName(control.value ?? '');
  return error ? { [error]: true } : null;
};

export function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { message?: unknown } } | null)?.error
    ?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.length > 0) return message;
  return fallback;
}

const NEAR_LIMIT_RATIO = 0.8;

export function usagePercent(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
}

export function isNearLimit(used: number, limit: number): boolean {
  return limit > 0 && used / limit >= NEAR_LIMIT_RATIO;
}
