export type ParseStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type ExtractionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type CvContactInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
};

export type CvExperienceItem = {
  title: string | null;
  company: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  bullets: string[];
};

export type CvEducationItem = {
  degree: string | null;
  institution: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  field: string | null;
};

export type CvCertification = {
  name: string;
  issuer: string | null;
  date: string | null;
};

export type CvProject = {
  name: string;
  description: string | null;
  technologies: string[];
  url: string | null;
};

export type CvLanguage = {
  language: string;
  proficiency: string | null;
};

export type CvStructuredData = {
  contact: CvContactInfo;
  summary: string | null;
  experience: CvExperienceItem;
  education: CvEducationItem;
  skills: string[];
  certifications: CvCertification;
  projects: CvProject;
  languages: CvLanguage;
  other: string | null;
};

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
  parseStatus: ParseStatus;
  structuredData: CvStructuredData | null;
  extractionStatus: ExtractionStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type UploadCvResponse = Pick<
  CvDocument,
  | 'id'
  | 'fileName'
  | 'fileSize'
  | 'mimeType'
  | 'storageKey'
  | 'createdAt'
  | 'parseStatus'
>;

export type CvDocumentListItem = Pick<
  CvDocument,
  | 'id'
  | 'fileName'
  | 'fileSize'
  | 'mimeType'
  | 'createdAt'
  | 'parsedText'
  | 'parseStatus'
>;
