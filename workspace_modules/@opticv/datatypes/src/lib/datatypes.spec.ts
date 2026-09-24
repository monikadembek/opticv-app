import type { User, UploadCvResponse } from './datatypes.js';
import { getEffectiveTier } from './datatypes.js';

describe('datatypes', () => {
  it('should export User type', () => {
    const user: User = {
      id: '1',
      supabaseId: 'sb-1',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user.id).toBe('1');
  });

  it('should export UploadCvResponse type', () => {
    const response: UploadCvResponse = {
      id: '1',
      fileName: 'cv.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      storageKey: 'key/cv.pdf',
      createdAt: new Date(),
      parseStatus: 'PENDING',
    };
    expect(response.fileName).toBe('cv.pdf');
  });

});

describe('getEffectiveTier', () => {
  it.each([
    ['FREE', 'ACTIVE', 'FREE'],
    ['BASIC', 'ACTIVE', 'BASIC'],
    ['PRO', 'ACTIVE', 'PRO'],
    ['BASIC', 'TRIALING', 'BASIC'],
    ['PRO', 'TRIALING', 'PRO'],
    ['PRO', 'PAST_DUE', 'FREE'],
    ['BASIC', 'CANCELED', 'FREE'],
  ] as const)(
    'resolves tier=%s status=%s to %s',
    (tier, status, expected) => {
      expect(getEffectiveTier(tier, status)).toBe(expected);
    },
  );
});
