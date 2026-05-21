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
  experience: CvExperienceItem[];
  education: CvEducationItem[];
  skills: string[];
  certifications: CvCertification[];
  projects: CvProject[];
  languages: CvLanguage[];
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

export type JobApplication = {
  id: string;
  userId: string;
  cvDocumentId: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  atsScore: number | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type JobApplicationResponse = JobApplication;

export type JobApplicationListItem = Pick<
  JobApplication,
  | 'id'
  | 'userId'
  | 'cvDocumentId'
  | 'jobTitle'
  | 'companyName'
  | 'atsScore'
  | 'createdAt'
  | 'updatedAt'
>;

export type JobApplicationListResponse = {
  data: JobApplicationListItem[];
  total: number;
};

export enum PromptType {
  RESUME_AUTOPSY = 'RESUME_AUTOPSY',
  KEYWORD_GAP = 'KEYWORD_GAP',
  SUMMARY_REWRITE = 'SUMMARY_REWRITE',
  BULLET_UPGRADE = 'BULLET_UPGRADE',
  COVER_LETTER = 'COVER_LETTER',
  INTERVIEW_PREP = 'INTERVIEW_PREP',
  LINKEDIN_REWRITE = 'LINKEDIN_REWRITE',
}

export type ResumeAutopsyIssue = {
  id: string;
  category:
    | 'parsing'
    | 'keywords'
    | 'structure'
    | 'content'
    | 'formatting'
    | 'length'
    | 'contact';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  quotedText: string;
  location: string;
  whyItMatters: string;
  fix: string;
  estimatedImpact: number;
};

export type ResumeAutopsyStrength = {
  title: string;
  detail: string;
};

export type ResumeAutopsyResult = {
  overallScore: number;
  predictedScoreAfterFixes: number;
  topPriority: string;
  issues: ResumeAutopsyIssue[];
  strengths: ResumeAutopsyStrength[];
  summary: string;
};

export type KeywordGapMatchScoreBreakdown = {
  requiredMatched: number;
  requiredTotal: number;
  preferredMatched: number;
  preferredTotal: number;
};

export type KeywordGapMatchedKeyword = {
  keyword: string;
  matchType: 'exact' | 'semantic' | 'partial';
  occurrencesInResume: number;
  isRequired: boolean;
};

export type KeywordGapMissingKeyword = {
  keyword: string;
  category: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  isRequired: boolean;
  candidateLikelyHas: boolean;
  evidenceFromResume: string;
  recommendation: string;
  suggestedPlacement:
    | 'summary'
    | 'skills'
    | 'experience_bullet'
    | 'title'
    | 'multiple';
};

export type KeywordGapUnderweightedKeyword = {
  keyword: string;
  currentOccurrences: number;
  recommendedOccurrences: number;
  suggestedAdditions: string[];
};

export type KeywordGapFabricationWarning = {
  keyword: string;
  reason: string;
};

export type KeywordGapAcronymIssue = {
  term: string;
  issue: string;
  fix: string;
};

export type KeywordGapResult = {
  matchScore: number;
  matchScoreBreakdown: KeywordGapMatchScoreBreakdown;
  matchedKeywords: KeywordGapMatchedKeyword[];
  missingKeywords: KeywordGapMissingKeyword[];
  underweightedKeywords: KeywordGapUnderweightedKeyword[];
  fabricationWarnings: KeywordGapFabricationWarning[];
  acronymIssues: KeywordGapAcronymIssue[];
};

export type SummaryRewriteVariantAngle =
  | 'achievement_led'
  | 'identity_led'
  | 'mission_led';

export type SummaryRewriteVariant = {
  angle: SummaryRewriteVariantAngle;
  text: string;
  wordCount: number;
  strategicNote: string;
  keywordsUsed: string[];
};

export type SummaryRewriteResult = {
  originalSummary: string;
  variants: SummaryRewriteVariant[];
  recommendedVariant: SummaryRewriteVariantAngle;
  recommendationReason?: string;
  keywordsIncorporated: string[];
};
