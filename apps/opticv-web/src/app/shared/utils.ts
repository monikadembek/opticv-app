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

const NEAR_LIMIT_RATIO = 0.8;

export function usagePercent(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
}

export function isNearLimit(used: number, limit: number): boolean {
  return limit > 0 && used / limit >= NEAR_LIMIT_RATIO;
}
