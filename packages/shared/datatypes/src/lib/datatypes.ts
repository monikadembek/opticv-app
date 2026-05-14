export type User = {
  id: string;
  supabaseId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CvDocument = {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  parsedText: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type UploadCvResponse = Pick<
  CvDocument,
  'id' | 'fileName' | 'fileSize' | 'mimeType' | 'storageKey' | 'createdAt'
>;

export type CvDocumentListItem = Pick<
  CvDocument,
  'id' | 'fileName' | 'fileSize' | 'mimeType' | 'createdAt' | 'parsedText'
>;
