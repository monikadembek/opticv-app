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

export type SubscriptionTier = 'FREE' | 'PRO' | 'PRO_ANNUAL' | 'SPRINT';

export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
  } | null;
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

export type BulletAction = 'rewrite' | 'recommend_cut' | 'keep_as_is';

export type BulletItem = {
  originalText: string;
  action: BulletAction;
  weakness: string;
  rewrittenText?: string;
  rewriteRationale?: string;
  needsUserInput: boolean;
  placeholdersToFill: string[];
  actionVerb: string;
  keywordsIncorporated: string[];
  cutReason?: string;
};

export type BulletUpgradePosition = {
  company: string;
  title: string;
  dates?: string;
  bullets: BulletItem[];
};

export type BulletMissingSuggestion = {
  forPosition: string;
  suggestedBullet: string;
  rationale: string;
  questionToAskUser: string;
};

export type BulletVerbDiversityCheck = {
  uniqueVerbsUsed: number;
  totalBullets: number;
  diverseEnough: boolean;
};

export type BulletUpgradeResult = {
  positions: BulletUpgradePosition[];
  missingBulletSuggestions: BulletMissingSuggestion[];
  overallNotes: string;
  verbDiversityCheck: BulletVerbDiversityCheck;
};

export type CoverLetterHookType = 'achievement' | 'insight' | 'story';

export type CoverLetterVariant = {
  hookType: CoverLetterHookType;
  fullLetter: string;
  wordCount: number;
  strategicAngle: string;
  openingHook: string;
  closingCTA: string;
  keywordsIncorporated: string[];
  bestFor?: string;
};

export type CoverLetterResult = {
  salutation: string;
  signoff: string;
  variants: CoverLetterVariant[];
  recommendedVariant: CoverLetterHookType;
  recommendationReason: string;
  warnings: string[];
};

export type InterviewPrepFollowUp = {
  followUpQuestion: string;
  guidance: string;
};

export type InterviewPrepQuestion = {
  question: string;
  category:
    | 'behavioral'
    | 'technical'
    | 'situational'
    | 'fit'
    | 'candidate_specific'
    | 'leadership'
    | 'culture';
  likelihood?: 'very_high' | 'high' | 'medium';
  whatTheyreAssessing: string;
  suggestedAnswer: string;
  answerWordCount: number;
  answerStructure: 'STAR' | 'narrative' | 'framework' | 'direct';
  needsUserInput: boolean;
  placeholdersToFill: string[];
  followUps: InterviewPrepFollowUp[];
  trapsToAvoid: string[];
};

export type InterviewPrepQuestionToAsk = {
  question: string;
  rationale: string;
};

export type InterviewPrepStressTest = {
  question: string;
  whyItllComeUp: string;
  recommendedAnswer: string;
};

export type InterviewPrepResult = {
  questions: InterviewPrepQuestion[];
  questionsToAskInterviewer: InterviewPrepQuestionToAsk[];
  stressTestQuestions: InterviewPrepStressTest[];
  preparationTips: string[];
};

export type OptimizationResultSummary = {
  id: string;
  promptType: PromptType;
  status: string;
  userEditedOutput: string | null;
};

export type BulletSelectionKey = {
  company: string;
  title: string;
  originalText: string;
};

export type UserSelections = {
  selectedSummaryAngle: SummaryRewriteVariantAngle | null;
  customSummaryText: string | null;
  selectedBullets: BulletSelectionKey[];
  selectedKeywords: string[];
};
