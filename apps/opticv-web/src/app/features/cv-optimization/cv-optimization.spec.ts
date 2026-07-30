import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import type {
  CvDocumentListItem,
  CvStructuredData,
  JobApplication,
  JobApplicationWithCv,
  OptimizationResultSummary,
} from '@opticv/datatypes';
import type { CvTemplateId } from './cv-templates';
import { PromptType } from '@opticv/datatypes';
import type { JobSubmittedData } from './components/job-upload/job-upload';
import { CvOptimization } from './cv-optimization';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';
import { CvApiService } from '../../core/services/cv-api.service';
import { CvExportService } from './services/cv-export.service';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';

const mockCv: CvDocumentListItem = {
  id: 'cv-id-1',
  fileName: 'my-cv.pdf',
  fileSize: 2048,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01').toISOString(),
  parsedText: null,
  parseStatus: 'COMPLETED',
};

const mockJobApplication: JobApplication = {
  id: 'job-app-id-1',
  userId: 'user-id-1',
  cvDocumentId: 'cv-id-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build amazing UIs',
  atsScore: null,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};

const mockCvStructuredData: CvStructuredData = {
  contact: {
    name: 'Test User',
    position: null,
    email: 'test@example.com',
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: null,
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
};

const mockJobSubmittedData: JobSubmittedData = {
  jobApplication: mockJobApplication,
  extractedData: mockCvStructuredData,
};

const mockJobApplicationWithCv: JobApplicationWithCv = {
  ...mockJobApplication,
  cvDocument: { id: 'cv-id-1', fileName: 'my-cv.pdf' },
};

function makeActivatedRoute(
  jobApplicationId: string | null = null,
  cvId: string | null = null,
) {
  return {
    snapshot: {
      paramMap: convertToParamMap(jobApplicationId ? { jobApplicationId } : {}),
      queryParamMap: convertToParamMap(cvId ? { cvId } : {}),
    },
  };
}

function makeCvListResource() {
  return {
    value: signal([mockCv]),
    isLoading: signal(false),
    error: signal(null),
  };
}

describe('CvOptimization', () => {
  // CvA4Preview (rendered inside the page's preview dialog) and PrimeNG's
  // TabList (rendered once results exist) both use ResizeObserver, which is
  // not available in JSDOM — assign directly to avoid vi.stubGlobal
  // side-effects on other test files sharing the same worker.
  const g = globalThis as Record<string, unknown>;
  const originalResizeObserver = g['ResizeObserver'];
  beforeEach(() => {
    g['ResizeObserver'] = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  afterEach(() => {
    g['ResizeObserver'] = originalResizeObserver;
  });

  let fixture: ComponentFixture<CvOptimization>;
  let component: CvOptimization;
  let apiService: {
    cvList: ReturnType<typeof makeCvListResource>;
    reloadCvList: ReturnType<typeof vi.fn>;
    createJobApplication: ReturnType<typeof vi.fn>;
    extractCvData: ReturnType<typeof vi.fn>;
    getStructuredData: ReturnType<typeof vi.fn>;
    getOptimizationResults: ReturnType<typeof vi.fn>;
    runSingleOptimizationProcess: ReturnType<typeof vi.fn>;
    retryFailedJob: ReturnType<typeof vi.fn>;
    streamOptimizationEvents: ReturnType<typeof vi.fn>;
    retryOptimization: ReturnType<typeof vi.fn>;
    saveUserOutput: ReturnType<typeof vi.fn>;
  };
  let userSettingsApiService: {
    userProfile: { value: ReturnType<typeof signal<{ subscription: { tier: string } } | null>> };
  };
  let jobApplicationApiService: {
    getJobApplication: ReturnType<typeof vi.fn>;
  };
  let cvApiService: {
    downloadCv: ReturnType<typeof vi.fn>;
  };
  let cvExportService: {
    exportToPdf: ReturnType<typeof vi.fn>;
    exportToDocx: ReturnType<typeof vi.fn>;
  };

  interface CreateComponentOptions {
    jobApplicationId?: string | null;
    cvId?: string | null;
    getOptimizationResults?: ReturnType<typeof vi.fn>;
    getStructuredData?: ReturnType<typeof vi.fn>;
  }

  async function createComponent(options: CreateComponentOptions = {}) {
    const {
      jobApplicationId = null,
      cvId = null,
      getOptimizationResults = vi.fn().mockReturnValue(of([])),
      getStructuredData = vi
        .fn()
        .mockReturnValue(of({ data: mockCvStructuredData })),
    } = options;

    TestBed.resetTestingModule();
    apiService = {
      cvList: makeCvListResource(),
      reloadCvList: vi.fn(),
      createJobApplication: vi.fn(),
      extractCvData: vi.fn(),
      getStructuredData,
      getOptimizationResults,
      runSingleOptimizationProcess: vi
        .fn()
        .mockReturnValue(of({ runId: 'run-id-1' })),
      retryFailedJob: vi.fn().mockReturnValue(of({ runId: 'run-id-1' })),
      streamOptimizationEvents: vi.fn().mockReturnValue(of()),
      retryOptimization: vi.fn(),
      saveUserOutput: vi
        .fn()
        .mockReturnValue(of({ userEditedOutput: '{}' })),
    };
    jobApplicationApiService = {
      getJobApplication: vi.fn().mockReturnValue(of(mockJobApplicationWithCv)),
    };
    cvApiService = {
      downloadCv: vi.fn().mockReturnValue(of({ url: 'https://signed.url' })),
    };
    cvExportService = {
      exportToPdf: vi.fn().mockResolvedValue(undefined),
      exportToDocx: vi.fn().mockResolvedValue(undefined),
    };
    userSettingsApiService = {
      userProfile: { value: signal(null) },
    };

    await TestBed.configureTestingModule({
      imports: [CvOptimization],
      providers: [
        { provide: CvOptimizationApiService, useValue: apiService },
        {
          provide: JobApplicationApiService,
          useValue: jobApplicationApiService,
        },
        { provide: CvApiService, useValue: cvApiService },
        { provide: CvExportService, useValue: cvExportService },
        { provide: UserSettingsApiService, useValue: userSettingsApiService },
        {
          provide: ActivatedRoute,
          useValue: makeActivatedRoute(jobApplicationId, cvId),
        },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvOptimization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the page heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent?.trim()).toContain('CV Optimization');
  });

  it('should render the job-upload component', () => {
    const jobUpload = fixture.nativeElement.querySelector('app-job-upload');
    expect(jobUpload).toBeTruthy();
  });

  describe('preselectedCvId', () => {
    it('is set from the cvId query param on init', async () => {
      await createComponent({ cvId: 'cv-id-1' });
      expect(component.preselectedCvId()).toBe('cv-id-1');
    });

    it('stays null when no cvId query param is present', () => {
      expect(component.preselectedCvId()).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('autopsyResult returns null when no result exists', () => {
      expect(component.autopsyResult()).toBeNull();
    });

    it('autopsyResult returns typed result when valid ResumeAutopsyResult is stored', () => {
      const result = {
        overallScore: 75,
        predictedScoreAfterFixes: 90,
        topPriority: 'Add keywords',
        summary: 'Decent resume',
        issues: [],
        strengths: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.autopsyResult()).toEqual(result);
    });

    it('keywordGapResult returns null when no result exists', () => {
      expect(component.keywordGapResult()).toBeNull();
    });

    it('keywordGapResult returns typed result when valid KeywordGapResult is stored', () => {
      const result = {
        matchScore: 80,
        matchScoreBreakdown: {
          requiredMatched: 3,
          requiredTotal: 5,
          preferredMatched: 2,
          preferredTotal: 4,
        },
        matchedKeywords: [],
        missingKeywords: [],
        underweightedKeywords: [],
        fabricationWarnings: [],
        acronymIssues: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            { promptType: PromptType.KEYWORD_GAP, status: 'completed', result },
          ],
        ]),
      );
      expect(component.keywordGapResult()).toEqual(result);
    });

    it('summaryRewriteResult returns null when no result exists', () => {
      expect(component.summaryRewriteResult()).toBeNull();
    });

    it('summaryRewriteResult returns typed result when valid SummaryRewriteResult is stored', () => {
      const result = {
        originalSummary: 'I am a developer',
        variants: [],
        recommendedVariant: 'achievement_led' as const,
        keywordsIncorporated: ['Angular'],
      };
      component.results.set(
        new Map([
          [
            PromptType.SUMMARY_REWRITE,
            {
              promptType: PromptType.SUMMARY_REWRITE,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.summaryRewriteResult()).toEqual(result);
    });

    it('summaryRewriteResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([
          [
            PromptType.SUMMARY_REWRITE,
            {
              promptType: PromptType.SUMMARY_REWRITE,
              status: 'completed',
              result: { foo: 'bar' },
            },
          ],
        ]),
      );
      expect(component.summaryRewriteResult()).toBeNull();
    });

    it('bulletUpgradeResult returns null when no result exists', () => {
      expect(component.bulletUpgradeResult()).toBeNull();
    });

    it('bulletUpgradeResult returns typed result when valid BulletUpgradeResult is stored', () => {
      const result = {
        positions: [],
        missingBulletSuggestions: [],
        overallNotes: 'Looks good.',
        verbDiversityCheck: {
          uniqueVerbsUsed: 4,
          totalBullets: 6,
          diverseEnough: true,
        },
      };
      component.results.set(
        new Map([
          [
            PromptType.BULLET_UPGRADE,
            {
              promptType: PromptType.BULLET_UPGRADE,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.bulletUpgradeResult()).toEqual(result);
    });

    it('bulletUpgradeResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([
          [
            PromptType.BULLET_UPGRADE,
            {
              promptType: PromptType.BULLET_UPGRADE,
              status: 'completed',
              result: { foo: 'bar' },
            },
          ],
        ]),
      );
      expect(component.bulletUpgradeResult()).toBeNull();
    });

    it('coverLetterResult returns null when no result exists', () => {
      expect(component.coverLetterResult()).toBeNull();
    });

    it('coverLetterResult returns typed result when valid CoverLetterResult is stored', () => {
      const result = {
        salutation: 'Dear Hiring Manager,',
        signoff: 'Yours sincerely,',
        variants: [
          {
            hookType: 'achievement' as const,
            fullLetter: 'My cover letter.',
            wordCount: 3,
            strategicAngle: 'Value-led',
            openingHook: 'I bring unique value.',
            closingCTA: 'Let us connect.',
            keywordsIncorporated: [],
          },
        ],
        recommendedVariant: 'achievement' as const,
        recommendationReason: 'Best fit.',
        warnings: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.COVER_LETTER,
            {
              promptType: PromptType.COVER_LETTER,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.coverLetterResult()).toEqual(result);
    });

    it('coverLetterResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([
          [
            PromptType.COVER_LETTER,
            {
              promptType: PromptType.COVER_LETTER,
              status: 'completed',
              result: { foo: 'bar' },
            },
          ],
        ]),
      );
      expect(component.coverLetterResult()).toBeNull();
    });

    it('coverLetterResult returns null when variants array is empty', () => {
      const result = {
        salutation: 'Dear Hiring Manager,',
        signoff: 'Yours sincerely,',
        variants: [],
        recommendedVariant: 'achievement' as const,
        recommendationReason: 'Best fit.',
        warnings: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.COVER_LETTER,
            {
              promptType: PromptType.COVER_LETTER,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.coverLetterResult()).toBeNull();
    });

    it('interviewPrepResult returns null when no result exists', () => {
      expect(component.interviewPrepResult()).toBeNull();
    });

    it('interviewPrepResult returns typed result when valid InterviewPrepResult is stored', () => {
      const result = {
        questions: [],
        questionsToAskInterviewer: [],
        stressTestQuestions: [],
        preparationTips: ['Research the company', 'Practice STAR answers'],
      };
      component.results.set(
        new Map([
          [
            PromptType.INTERVIEW_PREP,
            {
              promptType: PromptType.INTERVIEW_PREP,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.interviewPrepResult()).toEqual(result);
    });

    it('interviewPrepResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([
          [
            PromptType.INTERVIEW_PREP,
            {
              promptType: PromptType.INTERVIEW_PREP,
              status: 'completed',
              result: { foo: 'bar' },
            },
          ],
        ]),
      );
      expect(component.interviewPrepResult()).toBeNull();
    });

    it('interviewPrepResult returns null when preparationTips is missing', () => {
      component.results.set(
        new Map([
          [
            PromptType.INTERVIEW_PREP,
            {
              promptType: PromptType.INTERVIEW_PREP,
              status: 'completed',
              result: { questions: [] },
            },
          ],
        ]),
      );
      expect(component.interviewPrepResult()).toBeNull();
    });

    it('linkedInResult returns null when no result exists', () => {
      expect(component.linkedInResult()).toBeNull();
    });

    it('linkedInResult returns typed result when valid LinkedInRewriteResult is stored', () => {
      const result = {
        headlineVariants: [],
        aboutRewrite: {
          fullText: 'Full text',
          characterCount: 9,
          preview: 'Preview',
          structure: { hook: '', story: '', achievements: [], cta: '' },
        },
        additionalRecommendations: [],
        targetSearchQueries: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'completed',
              result,
            },
          ],
        ]),
      );
      expect(component.linkedInResult()).toEqual(result);
    });

    it('linkedInResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'completed',
              result: { foo: 'bar' },
            },
          ],
        ]),
      );
      expect(component.linkedInResult()).toBeNull();
    });

    it('linkedInResult returns null when headlineVariants is missing', () => {
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'completed',
              result: {
                aboutRewrite: {},
                additionalRecommendations: [],
                targetSearchQueries: [],
              },
            },
          ],
        ]),
      );
      expect(component.linkedInResult()).toBeNull();
    });

    it('linkedInResult returns null when aboutRewrite is missing', () => {
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'completed',
              result: {
                headlineVariants: [],
                additionalRecommendations: [],
                targetSearchQueries: [],
              },
            },
          ],
        ]),
      );
      expect(component.linkedInResult()).toBeNull();
    });
  });

  describe('runOptimization', () => {
    it('resets results before starting a new run', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            { promptType: PromptType.RESUME_AUTOPSY, status: 'completed' },
          ],
        ]),
      );

      component.runOptimization(mockJobSubmittedData);

      expect(component.results().size).toBe(0);
    });

    it('calls runSingleOptimizationProcess for each active PromptType', () => {
      component.runOptimization(mockJobSubmittedData);

      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledTimes(7);
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.RESUME_AUTOPSY,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.KEYWORD_GAP,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.BULLET_UPGRADE,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.SUMMARY_REWRITE,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.COVER_LETTER,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.INTERVIEW_PREP,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.LINKEDIN_REWRITE,
      );
    });

    it('calls streamOptimizationEvents with the jobApplicationId and runId from runSingle', () => {
      apiService.runSingleOptimizationProcess.mockReturnValue(
        of({ runId: 'run-abc' }),
      );

      component.runOptimization(mockJobSubmittedData);

      expect(apiService.streamOptimizationEvents).toHaveBeenCalledWith(
        mockJobApplication.id,
        'run-abc',
      );
    });

    it('sets isProcessing to true for the active prompt type as soon as its stream opens', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobSubmittedData);

      const processingValues = Array.from(component.isProcessing().values());
      expect(processingValues.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    });

    it('updates results and clears isProcessing on a completed SSE event', () => {
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.runOptimization(mockJobSubmittedData);

      const event: SseJobCompleteEvent = {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
        result: { score: 90 },
      };

      sseSubject.next(event);

      expect(component.results().get(PromptType.RESUME_AUTOPSY)).toEqual(event);
      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('stores a failed SSE event in results and clears isProcessing', () => {
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.runOptimization(mockJobSubmittedData);

      const failedEvent: SseJobCompleteEvent = {
        promptType: PromptType.KEYWORD_GAP,
        status: 'failed',
        error: 'AI service timeout',
      };

      sseSubject.next(failedEvent);

      expect(component.results().get(PromptType.KEYWORD_GAP)).toEqual(
        failedEvent,
      );
      expect(component.isProcessing().get(PromptType.KEYWORD_GAP)).toBe(false);
    });

    it('stores the result from an active prompt SSE event', () => {
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.runOptimization(mockJobSubmittedData);

      const bulletEvent: SseJobCompleteEvent = {
        promptType: PromptType.BULLET_UPGRADE,
        status: 'completed',
        result: {
          positions: [],
          missingBulletSuggestions: [],
          overallNotes: '',
          verbDiversityCheck: {},
        },
      };

      sseSubject.next(bulletEvent);

      expect(component.results().get(PromptType.BULLET_UPGRADE)).toEqual(
        bulletEvent,
      );
    });

    it('a second call to runOptimization discards results from the first', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobSubmittedData);
      // Manually poke in a result that should be cleared on re-run
      component.results.update((m) =>
        new Map(m).set(PromptType.RESUME_AUTOPSY, {
          promptType: PromptType.RESUME_AUTOPSY,
          status: 'completed',
        }),
      );

      component.runOptimization(mockJobSubmittedData);

      expect(component.results().size).toBe(0);
    });
  });

  describe('retryablePromptTypes', () => {
    it('returns an empty set when jobApplicationId is null', () => {
      expect(component.retryablePromptTypes().size).toBe(0);
    });

    it('returns an empty set when no results exist and nothing has failed', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      expect(component.retryablePromptTypes().size).toBe(0);
    });

    it('includes a prompt type whose SSE event had status failed', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'failed',
              error: 'timeout',
            },
          ],
        ]),
      );
      expect(component.retryablePromptTypes().has(PromptType.KEYWORD_GAP)).toBe(
        true,
      );
    });

    it('includes a prompt type that completed but returned an invalid result shape', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: { bad: 'data' },
            },
          ],
        ]),
      );
      expect(
        component.retryablePromptTypes().has(PromptType.RESUME_AUTOPSY),
      ).toBe(true);
    });

    it('does not include a prompt type that completed with a valid result', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      const validResult = {
        overallScore: 75,
        predictedScoreAfterFixes: 90,
        topPriority: 'Add keywords',
        summary: 'Decent resume',
        issues: [],
        strengths: [],
      };
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: validResult,
            },
          ],
        ]),
      );
      expect(
        component.retryablePromptTypes().has(PromptType.RESUME_AUTOPSY),
      ).toBe(false);
    });

    it('does not include a prompt type that is currently processing', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'failed',
              error: 'timeout',
            },
          ],
        ]),
      );
      component.isProcessing.set(new Map([[PromptType.KEYWORD_GAP, true]]));
      expect(component.retryablePromptTypes().has(PromptType.KEYWORD_GAP)).toBe(
        false,
      );
    });

    it('includes LINKEDIN_REWRITE when its SSE event had status failed', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'failed',
              error: 'timeout',
            },
          ],
        ]),
      );
      expect(
        component.retryablePromptTypes().has(PromptType.LINKEDIN_REWRITE),
      ).toBe(true);
    });

    it('does not include LINKEDIN_REWRITE when it completed with a valid result', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [
            PromptType.LINKEDIN_REWRITE,
            {
              promptType: PromptType.LINKEDIN_REWRITE,
              status: 'completed',
              result: {
                headlineVariants: [],
                aboutRewrite: {
                  fullText: '',
                  characterCount: 0,
                  preview: '',
                  structure: { hook: '', story: '', achievements: [], cta: '' },
                },
                additionalRecommendations: [],
                targetSearchQueries: [],
              },
            },
          ],
        ]),
      );
      expect(
        component.retryablePromptTypes().has(PromptType.LINKEDIN_REWRITE),
      ).toBe(false);
    });
  });

  describe('selectedTemplate', () => {
    it('defaults to default', () => {
      expect(component.selectedTemplate()).toBe(
        'default' satisfies CvTemplateId,
      );
    });

    it('can be set to modern', () => {
      component.selectedTemplate.set('modern');
      expect(component.selectedTemplate()).toBe('modern');
    });

    it('can be set to impact', () => {
      component.selectedTemplate.set('impact');
      expect(component.selectedTemplate()).toBe('impact');
    });
  });

  describe('accentColor', () => {
    it('defaults to emerald', () => {
      expect(component.accentColor()).toBe('#059669');
    });

    it('can be set to a different accent color', () => {
      component.accentColor.set('#2563eb');
      expect(component.accentColor()).toBe('#2563eb');
    });
  });

  describe('export calls', () => {
    beforeEach(() => {
      component.cvStructuredData.set(mockCvStructuredData);
    });

    it('exportCvAsPdf passes selectedTemplate and accentColor to exportToPdf', () => {
      component.selectedTemplate.set('modern');
      component.accentColor.set('#2563eb');
      component.exportCvAsPdf();
      expect(cvExportService.exportToPdf).toHaveBeenCalledWith(
        expect.anything(),
        'modern',
        '#2563eb',
      );
    });

    it('exportCvAsDocx passes selectedTemplate and accentColor to exportToDocx', () => {
      component.selectedTemplate.set('impact');
      component.accentColor.set('#dc2626');
      component.exportCvAsDocx();
      expect(cvExportService.exportToDocx).toHaveBeenCalledWith(
        expect.anything(),
        'impact',
        '#dc2626',
      );
    });
  });

  describe('isProcessingAny', () => {
    it('returns false when no active prompts are processing', () => {
      expect(component.isProcessingAny()).toBe(false);
    });

    it('returns true when at least one active prompt is processing', () => {
      component.isProcessing.set(new Map([[PromptType.KEYWORD_GAP, true]]));
      expect(component.isProcessingAny()).toBe(true);
    });

    it('returns true when RESUME_AUTOPSY is processing (it is an active prompt)', () => {
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      expect(component.isProcessingAny()).toBe(true);
    });

    it('returns false when all active prompts finish processing', () => {
      component.isProcessing.set(
        new Map([
          [PromptType.KEYWORD_GAP, false],
          [PromptType.RESUME_AUTOPSY, false],
          [PromptType.BULLET_UPGRADE, false],
        ]),
      );
      expect(component.isProcessingAny()).toBe(false);
    });
  });

  describe('canExportCv', () => {
    it('returns false when no CV data is available', () => {
      expect(component.canExportCv()).toBe(false);
    });

    it('returns true when CV data is set and nothing is processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      expect(component.canExportCv()).toBe(true);
    });

    it('returns false when CV data exists but an active prompt is still processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      expect(component.canExportCv()).toBe(false);
    });

    it('returns true once processing finishes and CV data is set', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, false]]));
      expect(component.canExportCv()).toBe(true);
    });
  });

  describe('allowedTemplateIds', () => {
    it('defaults to FREE tier templates (default, classic) when no profile is loaded', () => {
      expect(component.allowedTemplateIds()).toEqual(['default', 'classic']);
    });

    it('allows all templates for a BASIC tier user', () => {
      userSettingsApiService.userProfile.value.set({
        subscription: { tier: 'BASIC' },
      });
      expect(component.allowedTemplateIds().length).toBeGreaterThan(2);
      expect(component.allowedTemplateIds()).toContain('modern');
    });

    it('resets selectedTemplate away from a now-locked template', () => {
      userSettingsApiService.userProfile.value.set({
        subscription: { tier: 'BASIC' },
      });
      component.selectedTemplate.set('modern');
      expect(component.selectedTemplate()).toBe('modern');

      userSettingsApiService.userProfile.value.set({
        subscription: { tier: 'FREE' },
      });
      fixture.detectChanges();

      expect(component.allowedTemplateIds()).not.toContain('modern');
      expect(component.selectedTemplate()).not.toBe('modern');
    });
  });

  describe('retryOptimization', () => {
    it('does nothing when jobApplicationId is null', () => {
      component.retryOptimization(PromptType.RESUME_AUTOPSY);
      expect(apiService.retryFailedJob).not.toHaveBeenCalled();
    });

    it('sets isProcessing to true for the retried prompt type immediately', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.retryOptimization(PromptType.RESUME_AUTOPSY);

      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(
        true,
      );
    });

    it('calls retryFailedJob (free retry, no quota check) with the stored jobApplicationId and promptType', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.retryOptimization(PromptType.KEYWORD_GAP);

      expect(apiService.retryFailedJob).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.KEYWORD_GAP,
      );
      expect(apiService.runSingleOptimizationProcess).not.toHaveBeenCalled();
    });

    it('updates results and clears isProcessing when the retry SSE event arrives', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.retryOptimization(PromptType.RESUME_AUTOPSY);

      const event: SseJobCompleteEvent = {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
        result: {
          overallScore: 88,
          predictedScoreAfterFixes: 95,
          topPriority: 'Keywords',
          summary: 'Good',
          issues: [],
          strengths: [],
        },
      };
      sseSubject.next(event);

      expect(component.results().get(PromptType.RESUME_AUTOPSY)).toEqual(event);
      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('clears isProcessing on stream error', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.retryOptimization(PromptType.KEYWORD_GAP);
      sseSubject.error(new Error('network failure'));

      expect(component.isProcessing().get(PromptType.KEYWORD_GAP)).toBe(false);
    });
  });

  describe('isStoredMode', () => {
    it('defaults to false when no jobApplicationId route param is present', () => {
      expect(component.isStoredMode()).toBe(false);
    });

    it('is true when a jobApplicationId route param is present', async () => {
      await createComponent({ jobApplicationId: 'job-app-id-1' });
      expect(component.isStoredMode()).toBe(true);
    });
  });

  describe('loadStoredOptimization (ngOnInit with jobApplicationId)', () => {
    const completedResult: OptimizationResultSummary = {
      id: 'res-1',
      promptType: PromptType.RESUME_AUTOPSY,
      status: 'COMPLETED',
      userEditedOutput: null,
      structuredOutput: {
        overallScore: 80,
        predictedScoreAfterFixes: 90,
        topPriority: 'Keywords',
        summary: 'Good',
        issues: [],
        strengths: [],
      },
    };

    it('sets jobApplicationId and jobApplication from the fetched record', async () => {
      await createComponent({ jobApplicationId: 'job-app-id-1' });

      expect(component.jobApplicationId()).toBe('job-app-id-1');
      expect(component.jobApplication()).toEqual(mockJobApplicationWithCv);
    });

    it('populates results map with COMPLETED entries that have structuredOutput', async () => {
      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([completedResult])),
      });

      expect(component.results().has(PromptType.RESUME_AUTOPSY)).toBe(true);
      expect(
        component.results().get(PromptType.RESUME_AUTOPSY)?.result,
      ).toEqual(completedResult.structuredOutput);
    });

    it('skips results that are not COMPLETED', async () => {
      const pendingResult: OptimizationResultSummary = {
        ...completedResult,
        status: 'PENDING',
        structuredOutput: null,
      };
      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([pendingResult])),
      });

      expect(component.results().has(PromptType.RESUME_AUTOPSY)).toBe(false);
    });

    it('skips COMPLETED results with null structuredOutput', async () => {
      const noOutputResult: OptimizationResultSummary = {
        ...completedResult,
        structuredOutput: null,
      };
      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([noOutputResult])),
      });

      expect(component.results().has(PromptType.RESUME_AUTOPSY)).toBe(false);
    });

    it('calls getStructuredData with the cvDocumentId from the job application', async () => {
      await createComponent({ jobApplicationId: 'job-app-id-1' });

      expect(apiService.getStructuredData).toHaveBeenCalledWith(
        mockJobApplicationWithCv.cvDocumentId,
      );
    });

    it('sets cvStructuredData from getStructuredData response', async () => {
      await createComponent({ jobApplicationId: 'job-app-id-1' });

      expect(component.cvStructuredData()).toEqual(mockCvStructuredData);
    });

    it('sets loadError when the API call fails', async () => {
      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi
          .fn()
          .mockReturnValue(
            throwError(() => ({ error: { message: 'Server error' } })),
          ),
      });

      expect(component.loadError()).toBe('Server error');
    });

    it('uses fallback message when error has no message', async () => {
      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(throwError(() => ({}))),
      });

      expect(component.loadError()).toBe(
        'Failed to load optimization. Please try again.',
      );
    });
  });

  describe('hasPartialStoredResults', () => {
    it('returns false when not in stored mode', () => {
      expect(component.hasPartialStoredResults()).toBe(false);
    });

    it('returns true in stored mode when at least one active prompt has no result', () => {
      component.isStoredMode.set(true);
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            { promptType: PromptType.KEYWORD_GAP, status: 'completed' },
          ],
        ]),
      );
      expect(component.hasPartialStoredResults()).toBe(true);
    });

    it('returns false in stored mode when all active prompts have results', () => {
      component.isStoredMode.set(true);
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            { promptType: PromptType.RESUME_AUTOPSY, status: 'completed' },
          ],
          [
            PromptType.KEYWORD_GAP,
            { promptType: PromptType.KEYWORD_GAP, status: 'completed' },
          ],
          [
            PromptType.BULLET_UPGRADE,
            { promptType: PromptType.BULLET_UPGRADE, status: 'completed' },
          ],
          [
            PromptType.SUMMARY_REWRITE,
            { promptType: PromptType.SUMMARY_REWRITE, status: 'completed' },
          ],
          [
            PromptType.COVER_LETTER,
            { promptType: PromptType.COVER_LETTER, status: 'completed' },
          ],
          [
            PromptType.INTERVIEW_PREP,
            { promptType: PromptType.INTERVIEW_PREP, status: 'completed' },
          ],
          [
            PromptType.LINKEDIN_REWRITE,
            { promptType: PromptType.LINKEDIN_REWRITE, status: 'completed' },
          ],
        ]),
      );
      expect(component.hasPartialStoredResults()).toBe(false);
    });

    it('returns true in stored mode when only LINKEDIN_REWRITE result is missing', () => {
      component.isStoredMode.set(true);
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            { promptType: PromptType.RESUME_AUTOPSY, status: 'completed' },
          ],
          [
            PromptType.KEYWORD_GAP,
            { promptType: PromptType.KEYWORD_GAP, status: 'completed' },
          ],
          [
            PromptType.BULLET_UPGRADE,
            { promptType: PromptType.BULLET_UPGRADE, status: 'completed' },
          ],
          [
            PromptType.SUMMARY_REWRITE,
            { promptType: PromptType.SUMMARY_REWRITE, status: 'completed' },
          ],
          [
            PromptType.COVER_LETTER,
            { promptType: PromptType.COVER_LETTER, status: 'completed' },
          ],
          [
            PromptType.INTERVIEW_PREP,
            { promptType: PromptType.INTERVIEW_PREP, status: 'completed' },
          ],
        ]),
      );
      expect(component.hasPartialStoredResults()).toBe(true);
    });
  });

  describe('bullet state signals', () => {
    it('removedBullets defaults to an empty array', () => {
      expect(component.removedBullets()).toEqual([]);
    });

    it('selectedMissingBullets defaults to an empty array', () => {
      expect(component.selectedMissingBullets()).toEqual([]);
    });

    it('missingBulletEdits defaults to an empty Map', () => {
      expect(component.missingBulletEdits().size).toBe(0);
    });

    it('bulletEdits defaults to an empty Map', () => {
      expect(component.bulletEdits().size).toBe(0);
    });
  });

  describe('canExportCv — CV data with bullet state', () => {
    it('remains true when selectedMissingBullets is non-empty and not processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.selectedMissingBullets.set([
        { forPosition: 'Dev at Acme', suggestedBullet: 'Led team of 5.' },
      ]);
      expect(component.canExportCv()).toBe(true);
    });

    it('remains true when removedBullets is non-empty and not processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.removedBullets.set([
        { company: 'Acme', title: 'Dev', originalText: 'Old bullet.' },
      ]);
      expect(component.canExportCv()).toBe(true);
    });

    it('returns false when CV data and bullet state exist but a prompt is processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.selectedMissingBullets.set([
        { forPosition: 'Dev at Acme', suggestedBullet: 'Led team of 5.' },
      ]);
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      expect(component.canExportCv()).toBe(false);
    });
  });

  describe('onMissingBulletToggled', () => {
    const entry = {
      forPosition: 'Dev at Acme',
      suggestedBullet: 'Led team of 5.',
    };

    it('adds the entry when not already present', () => {
      component.onMissingBulletToggled(entry);
      expect(component.selectedMissingBullets()).toContainEqual(entry);
    });

    it('removes the entry when already present', () => {
      component.selectedMissingBullets.set([entry]);
      component.onMissingBulletToggled(entry);
      expect(component.selectedMissingBullets()).not.toContainEqual(entry);
    });
  });

  describe('onRemovedBulletToggled', () => {
    const key = { company: 'Acme', title: 'Dev', originalText: 'Old bullet.' };

    it('adds the key when not already present', () => {
      component.onRemovedBulletToggled(key);
      expect(component.removedBullets()).toContainEqual(key);
    });

    it('removes the key when already present', () => {
      component.removedBullets.set([key]);
      component.onRemovedBulletToggled(key);
      expect(component.removedBullets()).not.toContainEqual(key);
    });
  });

  describe('onMissingBulletEditStarted', () => {
    it('sets activeBulletEditKey to the provided key', () => {
      const key = 'Dev at Acme|Led team of 5.';
      component.onMissingBulletEditStarted(key);
      expect(component.activeBulletEditKey()).toBe(key);
    });

    it('sets editedBulletText from missingBulletEdits when entry exists', () => {
      const key = 'Dev at Acme|Led team of 5.';
      component.missingBulletEdits.set(new Map([[key, 'My edited text']]));
      component.onMissingBulletEditStarted(key);
      expect(component.editedBulletText()).toBe('My edited text');
    });

    it('sets editedBulletText to empty string when no existing edit and no matching suggestion', () => {
      const key = 'Dev at Acme|Led team of 5.';
      component.onMissingBulletEditStarted(key);
      expect(component.editedBulletText()).toBe('');
    });
  });

  describe('onMissingBulletEditSaved', () => {
    it('stores the trimmed text in missingBulletEdits', () => {
      component.jobApplicationId.set(null);
      component.onMissingBulletEditSaved({
        key: 'Pos|Bullet',
        text: '  Trimmed  ',
      });
      expect(component.missingBulletEdits().get('Pos|Bullet')).toBe('Trimmed');
    });

    it('removes the key from missingBulletEdits when text is blank', () => {
      component.missingBulletEdits.set(new Map([['Pos|Bullet', 'existing']]));
      component.jobApplicationId.set(null);
      component.onMissingBulletEditSaved({ key: 'Pos|Bullet', text: '   ' });
      expect(component.missingBulletEdits().has('Pos|Bullet')).toBe(false);
    });

    it('clears activeBulletEditKey and editedBulletText after save', () => {
      component.activeBulletEditKey.set('Pos|Bullet');
      component.editedBulletText.set('some text');
      component.jobApplicationId.set(null);
      component.onMissingBulletEditSaved({ key: 'Pos|Bullet', text: 'saved' });
      expect(component.activeBulletEditKey()).toBeNull();
      expect(component.editedBulletText()).toBe('');
    });
  });

  describe('runOptimization — resets new state', () => {
    it('clears selectedMissingBullets on a new run', () => {
      component.selectedMissingBullets.set([
        { forPosition: 'X', suggestedBullet: 'Y' },
      ]);
      component.runOptimization(mockJobSubmittedData);
      expect(component.selectedMissingBullets()).toEqual([]);
    });

    it('clears removedBullets on a new run', () => {
      component.removedBullets.set([
        { company: 'A', title: 'B', originalText: 'C' },
      ]);
      component.runOptimization(mockJobSubmittedData);
      expect(component.removedBullets()).toEqual([]);
    });

    it('clears missingBulletEdits on a new run', () => {
      component.missingBulletEdits.set(new Map([['key', 'val']]));
      component.runOptimization(mockJobSubmittedData);
      expect(component.missingBulletEdits().size).toBe(0);
    });
  });

  describe('openOriginalCv', () => {
    it('calls downloadCv with the cvDocument id from the job application', () => {
      component.jobApplication.set(mockJobApplicationWithCv);
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openOriginalCv();

      expect(cvApiService.downloadCv).toHaveBeenCalledWith(
        mockJobApplicationWithCv.cvDocument!.id,
      );
      openSpy.mockRestore();
    });

    it('opens the signed URL in a new tab', () => {
      component.jobApplication.set(mockJobApplicationWithCv);
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.openOriginalCv();

      expect(openSpy).toHaveBeenCalledWith('https://signed.url', '_blank');
      openSpy.mockRestore();
    });

    it('does nothing when jobApplication has no cvDocument', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component.jobApplication.set({
        ...mockJobApplicationWithCv,
        cvDocument: null as any,
      });

      expect(() => component.openOriginalCv()).not.toThrow();
      expect(cvApiService.downloadCv).not.toHaveBeenCalled();
    });

    it('does nothing when jobApplication is null', () => {
      component.jobApplication.set(null);

      expect(() => component.openOriginalCv()).not.toThrow();
      expect(cvApiService.downloadCv).not.toHaveBeenCalled();
    });
  });

  describe('pageState', () => {
    it('returns initial when jobApplicationId is null', () => {
      component.jobApplicationId.set(null);
      expect(component.pageState()).toBe('initial');
    });

    it('returns processing when jobApplicationId is set and an active prompt is processing', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      expect(component.pageState()).toBe('processing');
    });

    it('returns completed when jobApplicationId is set and no prompt is processing', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map());
      expect(component.pageState()).toBe('completed');
    });
  });

  describe('sectionStatuses', () => {
    it('returns an empty map when results is empty', () => {
      component.results.set(new Map());
      expect(component.sectionStatuses().size).toBe(0);
    });

    it('maps each result entry to its status string', () => {
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: {},
            },
          ],
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'failed',
              result: null,
            },
          ],
        ]),
      );
      expect(component.sectionStatuses().get(PromptType.RESUME_AUTOPSY)).toBe(
        'completed',
      );
      expect(component.sectionStatuses().get(PromptType.KEYWORD_GAP)).toBe(
        'failed',
      );
    });
  });

  describe('handleSectionClick', () => {
    it('updates activeSection to the given id', () => {
      component.handleSectionClick(PromptType.KEYWORD_GAP);
      expect(component.activeSection()).toBe(PromptType.KEYWORD_GAP);
    });

    it('expands the section when it was collapsed', () => {
      component.onSectionCollapsedChange(PromptType.KEYWORD_GAP, true);
      component.handleSectionClick(PromptType.KEYWORD_GAP);
      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(false);
    });

    it('leaves other collapsed sections untouched', () => {
      component.onSectionCollapsedChange(PromptType.KEYWORD_GAP, true);
      component.onSectionCollapsedChange(PromptType.BULLET_UPGRADE, true);
      component.handleSectionClick(PromptType.KEYWORD_GAP);
      expect(component.isSectionCollapsed(PromptType.BULLET_UPGRADE)).toBe(
        true,
      );
    });

    it('does not throw when clicking a section that is already expanded', () => {
      expect(() =>
        component.handleSectionClick(PromptType.RESUME_AUTOPSY),
      ).not.toThrow();
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });
  });

  describe('collapsedSections / isSectionCollapsed / onSectionCollapsedChange', () => {
    it('no section is collapsed by default', () => {
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('marks a section as collapsed', () => {
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        true,
      );
    });

    it('marks a section as expanded again', () => {
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, false);
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('tracks multiple collapsed sections independently', () => {
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      component.onSectionCollapsedChange(PromptType.KEYWORD_GAP, true);

      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        true,
      );
      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(true);
      expect(component.isSectionCollapsed(PromptType.BULLET_UPGRADE)).toBe(
        false,
      );
    });
  });

  describe('default-collapse effect', () => {
    it('leaves collapsedSections empty while pageState is initial', () => {
      component.jobApplicationId.set(null);
      fixture.detectChanges();

      expect(component.collapsedSections().size).toBe(0);
    });

    it('collapses all cv-analysis-tab sections except RESUME_AUTOPSY on first transition to processing', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      fixture.detectChanges();

      const expectedCollapsed = component
        .cvAnalysisSectionIds()
        .filter((id) => id !== PromptType.RESUME_AUTOPSY);

      for (const id of expectedCollapsed) {
        expect(component.isSectionCollapsed(id)).toBe(true);
      }
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('applies the same default collapse when a stored optimization is loaded', async () => {
      await createComponent({ jobApplicationId: 'job-app-id-1' });
      fixture.detectChanges();

      expect(component.pageState()).toBe('completed');
      const expectedCollapsed = component
        .cvAnalysisSectionIds()
        .filter((id) => id !== PromptType.RESUME_AUTOPSY);

      for (const id of expectedCollapsed) {
        expect(component.isSectionCollapsed(id)).toBe(true);
      }
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('applies the Additional Materials default (Cover Letter expanded) the first time that tab is viewed', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      fixture.detectChanges();

      component.onResultsTabChanged('additional-materials');
      fixture.detectChanges();

      expect(component.isSectionCollapsed(PromptType.COVER_LETTER)).toBe(
        false,
      );
      expect(component.isSectionCollapsed(PromptType.INTERVIEW_PREP)).toBe(
        true,
      );
      expect(component.isSectionCollapsed(PromptType.LINKEDIN_REWRITE)).toBe(
        true,
      );
    });

    it('preserves cv-analysis collapse state when switching back from additional-materials', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      fixture.detectChanges();

      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      component.onResultsTabChanged('additional-materials');
      fixture.detectChanges();
      component.onResultsTabChanged('cv-analysis');
      fixture.detectChanges();

      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        true,
      );
    });

    it('does not re-apply defaults after the user manually changes collapsedSections', () => {
      component.jobApplicationId.set('job-1');
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      fixture.detectChanges();

      component.onSectionCollapsedChange(PromptType.KEYWORD_GAP, false);
      fixture.detectChanges();

      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(false);

      // Trigger another pageState-affecting change; the effect must not
      // overwrite the user's manual choice since initializedDefaults is set.
      component.isProcessing.set(
        new Map([[PromptType.RESUME_AUTOPSY, false]]),
      );
      fixture.detectChanges();

      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(false);
    });

    it('re-applies the default collapse on a second runOptimization call', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobSubmittedData);
      fixture.detectChanges();

      component.onSectionCollapsedChange(PromptType.KEYWORD_GAP, false);
      fixture.detectChanges();
      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(false);

      component.runOptimization(mockJobSubmittedData);
      fixture.detectChanges();

      expect(component.isSectionCollapsed(PromptType.KEYWORD_GAP)).toBe(true);
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });
  });

  describe('allSectionsCollapsed / toggleAllSections', () => {
    it('is false by default when no sections are collapsed', () => {
      expect(component.allSectionsCollapsed()).toBe(false);
    });

    it('is false when only some sections are collapsed', () => {
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      expect(component.allSectionsCollapsed()).toBe(false);
    });

    it('is true once every active-tab section is collapsed', () => {
      for (const id of component.activeTabSectionIds()) {
        component.onSectionCollapsedChange(id, true);
      }
      expect(component.allSectionsCollapsed()).toBe(true);
    });

    it('collapses every active-tab section when none are collapsed', () => {
      component.toggleAllSections();

      for (const id of component.activeTabSectionIds()) {
        expect(component.isSectionCollapsed(id)).toBe(true);
      }
      expect(component.allSectionsCollapsed()).toBe(true);
    });

    it('expands every active-tab section when all are collapsed', () => {
      component.toggleAllSections();
      component.toggleAllSections();

      for (const id of component.activeTabSectionIds()) {
        expect(component.isSectionCollapsed(id)).toBe(false);
      }
      expect(component.allSectionsCollapsed()).toBe(false);
    });

    it('collapses all active-tab sections when toggled from a partially collapsed state', () => {
      component.onSectionCollapsedChange(PromptType.RESUME_AUTOPSY, true);
      component.toggleAllSections();

      for (const id of component.activeTabSectionIds()) {
        expect(component.isSectionCollapsed(id)).toBe(true);
      }
    });

    it('does not affect the inactive tab (Additional Materials) sections', () => {
      component.toggleAllSections();

      expect(component.isSectionCollapsed(PromptType.COVER_LETTER)).toBe(
        false,
      );
      expect(component.isSectionCollapsed(PromptType.INTERVIEW_PREP)).toBe(
        false,
      );
      expect(component.isSectionCollapsed(PromptType.LINKEDIN_REWRITE)).toBe(
        false,
      );
    });

    it('scopes to Additional Materials sections when that tab is active', () => {
      component.onResultsTabChanged('additional-materials');

      component.toggleAllSections();

      for (const id of component.additionalMaterialsSectionIds()) {
        expect(component.isSectionCollapsed(id)).toBe(true);
      }
      expect(component.isSectionCollapsed(PromptType.RESUME_AUTOPSY)).toBe(
        false,
      );
    });

    it('includes JOB_POSTING in live mode once a job application is submitted', () => {
      component.runOptimization(mockJobSubmittedData);
      expect(component.allSectionIds()).toContain('JOB_POSTING');
    });

    it('does not include JOB_POSTING before a job application is submitted', () => {
      expect(component.allSectionIds()).not.toContain('JOB_POSTING');
    });
  });

  describe('activeResultsTab / onResultsTabChanged', () => {
    it('defaults to cv-analysis', () => {
      expect(component.activeResultsTab()).toBe('cv-analysis');
    });

    it('switches to additional-materials', () => {
      component.onResultsTabChanged('additional-materials');
      expect(component.activeResultsTab()).toBe('additional-materials');
    });

    it('switches back to cv-analysis', () => {
      component.onResultsTabChanged('additional-materials');
      component.onResultsTabChanged('cv-analysis');
      expect(component.activeResultsTab()).toBe('cv-analysis');
    });

    it('cancels an open bullet edit when switching tabs', () => {
      component.activeBulletEditKey.set('Acme|Dev|Old bullet');
      component.editedBulletText.set('In progress edit');

      component.onResultsTabChanged('additional-materials');

      expect(component.activeBulletEditKey()).toBeNull();
      expect(component.editedBulletText()).toBe('');
    });

    it('cancels an open keyword edit when switching tabs', () => {
      component.activeKeywordEditKey.set('TypeScript');
      component.editedKeywordText.set('In progress edit');

      component.onResultsTabChanged('additional-materials');

      expect(component.activeKeywordEditKey()).toBeNull();
      expect(component.editedKeywordText()).toBe('');
    });

    it('runOptimization resets activeResultsTab back to cv-analysis', () => {
      component.onResultsTabChanged('additional-materials');

      component.runOptimization(mockJobSubmittedData);

      expect(component.activeResultsTab()).toBe('cv-analysis');
    });
  });

  describe('export footer visibility', () => {
    beforeEach(() => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.jobApplicationId.set(mockJobApplication.id);
    });

    it('canExportCv is true and activeResultsTab is cv-analysis by default', () => {
      expect(component.canExportCv()).toBe(true);
      expect(component.activeResultsTab()).toBe('cv-analysis');
    });

    it('activeResultsTab switches away from cv-analysis when Additional Materials is active', () => {
      component.onResultsTabChanged('additional-materials');
      expect(component.activeResultsTab()).not.toBe('cv-analysis');
      expect(component.canExportCv()).toBe(true);
    });
  });

  describe('atsScore', () => {
    it('returns null when no autopsy result exists', () => {
      expect(component.atsScore()).toBeNull();
    });

    it('returns overallScore from autopsy result', () => {
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: {
                overallScore: 72,
                predictedScoreAfterFixes: 90,
                topPriority: 'Keywords',
                summary: 'Good',
                issues: [],
                strengths: [],
              },
            },
          ],
        ]),
      );
      expect(component.atsScore()).toBe(72);
    });
  });

  describe('keywordScore', () => {
    it('returns null when no keyword gap result exists', () => {
      expect(component.keywordScore()).toBeNull();
    });

    it('returns matchScore from keyword gap result', () => {
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'completed',
              result: {
                matchScore: 65,
                matchScoreBreakdown: {
                  requiredMatched: 3,
                  requiredTotal: 5,
                  preferredMatched: 2,
                  preferredTotal: 4,
                },
                matchedKeywords: [],
                missingKeywords: [],
                underweightedKeywords: [],
                fabricationWarnings: [],
                acronymIssues: [],
              },
            },
          ],
        ]),
      );
      expect(component.keywordScore()).toBe(65);
    });
  });

  describe('liveKeywordScore', () => {
    it('returns null when no keyword gap result exists', () => {
      expect(component.liveKeywordScore()).toBeNull();
    });

    it('returns the same matchScore when no keywords are selected', () => {
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'completed',
              result: {
                matchScore: 60,
                matchScoreBreakdown: {
                  requiredMatched: 3,
                  requiredTotal: 5,
                  preferredMatched: 2,
                  preferredTotal: 4,
                },
                matchedKeywords: [],
                missingKeywords: [],
                underweightedKeywords: [],
                fabricationWarnings: [],
                acronymIssues: [],
              },
            },
          ],
        ]),
      );
      expect(component.liveKeywordScore()).toBe(60);
    });

    it('returns an updated score when a missing keyword is selected', () => {
      component.results.set(
        new Map([
          [
            PromptType.KEYWORD_GAP,
            {
              promptType: PromptType.KEYWORD_GAP,
              status: 'completed',
              result: {
                matchScore: 60,
                matchScoreBreakdown: {
                  requiredMatched: 3,
                  requiredTotal: 5,
                  preferredMatched: 2,
                  preferredTotal: 4,
                },
                matchedKeywords: [],
                missingKeywords: [
                  {
                    keyword: 'TypeScript',
                    category: 'languages',
                    importance: 'critical',
                    isRequired: true,
                    candidateLikelyHas: true,
                    evidenceFromResume: '',
                    recommendation: '',
                    suggestedPlacement: 'skills',
                  },
                ],
                underweightedKeywords: [],
                fabricationWarnings: [],
                acronymIssues: [],
              },
            },
          ],
        ]),
      );
      component.selections.update((s) => ({
        ...s,
        selectedKeywords: ['TypeScript'],
      }));
      expect(component.liveKeywordScore()).toBeGreaterThan(60);
    });
  });

  describe('projectedAtsScore', () => {
    it('returns null when no autopsy result exists', () => {
      expect(component.projectedAtsScore()).toBeNull();
    });

    it('returns null when autopsy result exists but no selections are made', () => {
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: {
                overallScore: 50,
                predictedScoreAfterFixes: 80,
                topPriority: 'Keywords',
                summary: 'Decent',
                issues: [],
                strengths: [],
              },
            },
          ],
        ]),
      );
      expect(component.projectedAtsScore()).toBeNull();
    });

    it('returns a projected score when a keyword is selected and there is a keyword issue', () => {
      component.results.set(
        new Map([
          [
            PromptType.RESUME_AUTOPSY,
            {
              promptType: PromptType.RESUME_AUTOPSY,
              status: 'completed',
              result: {
                overallScore: 50,
                predictedScoreAfterFixes: 80,
                topPriority: 'Keywords',
                summary: 'Decent',
                issues: [
                  {
                    id: 'kw-1',
                    category: 'keywords',
                    severity: 'high',
                    title: 'Missing keywords',
                    quotedText: '',
                    location: '',
                    whyItMatters: '',
                    fix: '',
                    estimatedImpact: 10,
                  },
                ],
                strengths: [],
              },
            },
          ],
        ]),
      );
      component.selections.update((s) => ({
        ...s,
        selectedKeywords: ['Angular'],
      }));
      expect(component.projectedAtsScore()).toBeGreaterThan(50);
    });
  });

  describe('onAngleReset()', () => {
    it('clears selectedSummaryAngle and customSummaryText', () => {
      component.onAngleSelected('achievement_led');
      component.onSummaryTextEdited('Edited text');
      component.onAngleReset();
      expect(component.selections().selectedSummaryAngle).toBeNull();
      expect(component.selections().customSummaryText).toBeNull();
    });

    it('preserves selectedBullets and selectedKeywords', () => {
      const bullet = { company: 'Acme', title: 'Dev', originalText: 'Built X' };
      component.selections.update((s) => ({
        ...s,
        selectedBullets: [bullet],
        selectedKeywords: ['Angular'],
      }));
      component.onAngleReset();
      expect(component.selections().selectedBullets).toEqual([bullet]);
      expect(component.selections().selectedKeywords).toEqual(['Angular']);
    });
  });

  describe('summary selection persistence', () => {
    const g = globalThis as Record<string, unknown>;
    let originalIntersectionObserver: unknown;

    beforeEach(() => {
      originalIntersectionObserver = g['IntersectionObserver'];
      g['IntersectionObserver'] = class {
        observe = vi.fn();
        disconnect = vi.fn();
      };
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      g['IntersectionObserver'] = originalIntersectionObserver;
    });

    it('onAngleSelected persists the selection to the known SUMMARY_REWRITE result id', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.summaryRewriteResultId.set('summary-result-1');

      component.onAngleSelected('achievement_led');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'summary-result-1',
        JSON.stringify({
          selectedSummaryAngle: 'achievement_led',
          customSummaryText: null,
        }),
      );
    });

    it('onAngleReset persists a cleared selection', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.summaryRewriteResultId.set('summary-result-1');

      component.onAngleSelected('mission_led');
      vi.advanceTimersByTime(500);
      component.onAngleReset();
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenLastCalledWith(
        'summary-result-1',
        JSON.stringify({
          selectedSummaryAngle: null,
          customSummaryText: null,
        }),
      );
    });

    it('onSummaryTextEdited persists the custom text alongside the selected angle', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.summaryRewriteResultId.set('summary-result-1');

      component.onAngleSelected('identity_led');
      component.onSummaryTextEdited('My custom summary');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenLastCalledWith(
        'summary-result-1',
        JSON.stringify({
          selectedSummaryAngle: 'identity_led',
          customSummaryText: 'My custom summary',
        }),
      );
    });

    it('debounces rapid selection changes into a single save', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.summaryRewriteResultId.set('summary-result-1');

      component.onAngleSelected('achievement_led');
      vi.advanceTimersByTime(100);
      component.onAngleSelected('mission_led');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenCalledTimes(1);
      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'summary-result-1',
        JSON.stringify({
          selectedSummaryAngle: 'mission_led',
          customSummaryText: null,
        }),
      );
    });

    it('fetches the SUMMARY_REWRITE result id when not already known, then saves', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.getOptimizationResults.mockReturnValue(
        of([
          {
            id: 'summary-result-fetched',
            promptType: PromptType.SUMMARY_REWRITE,
            status: 'COMPLETED',
            userEditedOutput: null,
            structuredOutput: null,
          },
        ]),
      );

      component.onAngleSelected('achievement_led');
      vi.advanceTimersByTime(500);

      expect(apiService.getOptimizationResults).toHaveBeenCalledWith(
        mockJobApplication.id,
      );
      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'summary-result-fetched',
        JSON.stringify({
          selectedSummaryAngle: 'achievement_led',
          customSummaryText: null,
        }),
      );
    });

    it('does not save when jobApplicationId is null', () => {
      component.onAngleSelected('achievement_led');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).not.toHaveBeenCalled();
    });

    it('shows an error toast when saving fails', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.summaryRewriteResultId.set('summary-result-1');
      apiService.saveUserOutput.mockReturnValue(
        throwError(() => new Error('network error')),
      );
      const messageService = TestBed.inject(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      component.onAngleSelected('achievement_led');
      vi.advanceTimersByTime(500);

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  describe('loadStoredOptimization — restores summary selection', () => {
    it('restores selectedSummaryAngle and customSummaryText from userEditedOutput', async () => {
      const summaryResult: OptimizationResultSummary = {
        id: 'summary-result-1',
        promptType: PromptType.SUMMARY_REWRITE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          selectedSummaryAngle: 'mission_led',
          customSummaryText: 'Saved custom text',
        }),
        structuredOutput: {
          originalSummary: 'Old summary',
          variants: [],
          recommendedVariant: 'mission_led',
          keywordsIncorporated: [],
        },
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([summaryResult])),
      });

      expect(component.selections().selectedSummaryAngle).toBe('mission_led');
      expect(component.selections().customSummaryText).toBe(
        'Saved custom text',
      );
      expect(component.summaryRewriteResultId()).toBe('summary-result-1');
    });

    it('leaves selections untouched when userEditedOutput is null', async () => {
      const summaryResult: OptimizationResultSummary = {
        id: 'summary-result-1',
        promptType: PromptType.SUMMARY_REWRITE,
        status: 'COMPLETED',
        userEditedOutput: null,
        structuredOutput: {
          originalSummary: 'Old summary',
          variants: [],
          recommendedVariant: 'mission_led',
          keywordsIncorporated: [],
        },
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([summaryResult])),
      });

      expect(component.selections().selectedSummaryAngle).toBeNull();
      expect(component.selections().customSummaryText).toBeNull();
    });

    it('does not throw and leaves selections untouched when userEditedOutput is malformed JSON', async () => {
      const summaryResult: OptimizationResultSummary = {
        id: 'summary-result-1',
        promptType: PromptType.SUMMARY_REWRITE,
        status: 'COMPLETED',
        userEditedOutput: 'not valid json',
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([summaryResult])),
      });

      expect(component.selections().selectedSummaryAngle).toBeNull();
      expect(component.selections().customSummaryText).toBeNull();
    });
  });

  describe('cover letter selection persistence', () => {
    const g = globalThis as Record<string, unknown>;
    let originalIntersectionObserver: unknown;

    beforeEach(() => {
      originalIntersectionObserver = g['IntersectionObserver'];
      g['IntersectionObserver'] = class {
        observe = vi.fn();
        disconnect = vi.fn();
      };
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      g['IntersectionObserver'] = originalIntersectionObserver;
    });

    it('onCoverLetterVariantSelected persists the selection to the known COVER_LETTER result id', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.coverLetterResultId.set('cover-letter-result-1');

      component.onCoverLetterVariantSelected('achievement');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'cover-letter-result-1',
        JSON.stringify({
          selectedVariant: 'achievement',
          editedContent: null,
        }),
      );
    });

    it('onCoverLetterTextEdited persists the edited content alongside the selected variant', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.coverLetterResultId.set('cover-letter-result-1');

      component.onCoverLetterVariantSelected('insight');
      component.onCoverLetterTextEdited('<p>Edited letter</p>');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenLastCalledWith(
        'cover-letter-result-1',
        JSON.stringify({
          selectedVariant: 'insight',
          editedContent: '<p>Edited letter</p>',
        }),
      );
    });

    it('debounces rapid edits into a single save', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.coverLetterResultId.set('cover-letter-result-1');

      component.onCoverLetterTextEdited('<p>First</p>');
      vi.advanceTimersByTime(100);
      component.onCoverLetterTextEdited('<p>Second</p>');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).toHaveBeenCalledTimes(1);
      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'cover-letter-result-1',
        JSON.stringify({
          selectedVariant: null,
          editedContent: '<p>Second</p>',
        }),
      );
    });

    it('fetches the COVER_LETTER result id when not already known, then saves', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.getOptimizationResults.mockReturnValue(
        of([
          {
            id: 'cover-letter-result-fetched',
            promptType: PromptType.COVER_LETTER,
            status: 'COMPLETED',
            userEditedOutput: null,
            structuredOutput: null,
          },
        ]),
      );

      component.onCoverLetterVariantSelected('story');
      vi.advanceTimersByTime(500);

      expect(apiService.getOptimizationResults).toHaveBeenCalledWith(
        mockJobApplication.id,
      );
      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'cover-letter-result-fetched',
        JSON.stringify({
          selectedVariant: 'story',
          editedContent: null,
        }),
      );
    });

    it('does not save when jobApplicationId is null', () => {
      component.onCoverLetterVariantSelected('achievement');
      vi.advanceTimersByTime(500);

      expect(apiService.saveUserOutput).not.toHaveBeenCalled();
    });

    it('shows an error toast when saving fails', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.coverLetterResultId.set('cover-letter-result-1');
      apiService.saveUserOutput.mockReturnValue(
        throwError(() => new Error('network error')),
      );
      const messageService = TestBed.inject(MessageService);
      const addSpy = vi.spyOn(messageService, 'add');

      component.onCoverLetterVariantSelected('achievement');
      vi.advanceTimersByTime(500);

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  describe('loadStoredOptimization — restores cover letter selection', () => {
    it('restores selectedCoverLetterVariant and editedCoverLetterContent from userEditedOutput', async () => {
      const coverLetterResult: OptimizationResultSummary = {
        id: 'cover-letter-result-1',
        promptType: PromptType.COVER_LETTER,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          selectedVariant: 'story',
          editedContent: '<p>Saved edited content</p>',
        }),
        structuredOutput: {
          salutation: 'Dear Hiring Manager,',
          signoff: 'Yours sincerely,',
          variants: [],
          recommendedVariant: 'insight',
          recommendationReason: '',
          warnings: [],
        },
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi
          .fn()
          .mockReturnValue(of([coverLetterResult])),
      });

      expect(component.selectedCoverLetterVariant()).toBe('story');
      expect(component.editedCoverLetterContent()).toBe(
        '<p>Saved edited content</p>',
      );
      expect(component.coverLetterResultId()).toBe('cover-letter-result-1');
    });

    it('leaves selection state untouched when userEditedOutput is null', async () => {
      const coverLetterResult: OptimizationResultSummary = {
        id: 'cover-letter-result-1',
        promptType: PromptType.COVER_LETTER,
        status: 'COMPLETED',
        userEditedOutput: null,
        structuredOutput: {
          salutation: 'Dear Hiring Manager,',
          signoff: 'Yours sincerely,',
          variants: [],
          recommendedVariant: 'insight',
          recommendationReason: '',
          warnings: [],
        },
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi
          .fn()
          .mockReturnValue(of([coverLetterResult])),
      });

      expect(component.selectedCoverLetterVariant()).toBeNull();
      expect(component.editedCoverLetterContent()).toBeNull();
    });

    it('does not throw and leaves selection state untouched when userEditedOutput is malformed JSON', async () => {
      const coverLetterResult: OptimizationResultSummary = {
        id: 'cover-letter-result-1',
        promptType: PromptType.COVER_LETTER,
        status: 'COMPLETED',
        userEditedOutput: 'not valid json',
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi
          .fn()
          .mockReturnValue(of([coverLetterResult])),
      });

      expect(component.selectedCoverLetterVariant()).toBeNull();
      expect(component.editedCoverLetterContent()).toBeNull();
    });
  });

  describe('runOptimization — resets cover letter state', () => {
    it('clears coverLetterResultId, selectedCoverLetterVariant, and editedCoverLetterContent on a new run', () => {
      component.coverLetterResultId.set('cover-letter-result-1');
      component.selectedCoverLetterVariant.set('story');
      component.editedCoverLetterContent.set('<p>Edited</p>');

      component.runOptimization(mockJobSubmittedData);

      expect(component.coverLetterResultId()).toBeNull();
      expect(component.selectedCoverLetterVariant()).toBeNull();
      expect(component.editedCoverLetterContent()).toBeNull();
    });
  });

  describe('onKeywordToggled — persistence', () => {
    it('persists selectedKeywords to the known BULLET_UPGRADE result id', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.bulletUpgradeResultId.set('bullet-result-1');

      component.onKeywordToggled('TypeScript');

      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'bullet-result-1',
        JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
          keywordEdits: [],
          keywordBulletPositions: [],
          selectedKeywords: ['TypeScript'],
          acronymEdits: [],
          acronymBulletPositions: [],
          selectedAcronymIssues: [],
        }),
      );
    });

    it('removes a keyword from selectedKeywords when toggled off, and persists', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.bulletUpgradeResultId.set('bullet-result-1');

      component.onKeywordToggled('TypeScript');
      component.onKeywordToggled('TypeScript');

      expect(component.selections().selectedKeywords).toEqual([]);
      expect(apiService.saveUserOutput).toHaveBeenLastCalledWith(
        'bullet-result-1',
        expect.stringContaining('"selectedKeywords":[]'),
      );
    });
  });

  describe('loadStoredOptimization — restores selected keywords', () => {
    it('restores selectedKeywords from BULLET_UPGRADE userEditedOutput', async () => {
      const bulletResult: OptimizationResultSummary = {
        id: 'bullet-result-1',
        promptType: PromptType.BULLET_UPGRADE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
          selectedKeywords: ['TypeScript', 'Angular'],
        }),
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([bulletResult])),
      });

      expect(component.selections().selectedKeywords).toEqual([
        'TypeScript',
        'Angular',
      ]);
      expect(component.bulletUpgradeResultId()).toBe('bullet-result-1');
    });

    it('defaults selectedKeywords to an empty array when absent from stored state', async () => {
      const bulletResult: OptimizationResultSummary = {
        id: 'bullet-result-1',
        promptType: PromptType.BULLET_UPGRADE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
        }),
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([bulletResult])),
      });

      expect(component.selections().selectedKeywords).toEqual([]);
    });
  });

  describe('onKeywordBulletPositionSelected — persistence', () => {
    it('persists keywordBulletPositions to the known BULLET_UPGRADE result id', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.bulletUpgradeResultId.set('bullet-result-1');

      component.onKeywordBulletPositionSelected({
        keyword: 'React',
        experienceIndex: 0,
      });

      expect(apiService.saveUserOutput).toHaveBeenCalledWith(
        'bullet-result-1',
        JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
          keywordEdits: [],
          keywordBulletPositions: [{ keyword: 'React', experienceIndex: 0 }],
          selectedKeywords: [],
          acronymEdits: [],
          acronymBulletPositions: [],
          selectedAcronymIssues: [],
        }),
      );
    });

    it('removes a keyword position when experienceIndex is null, and persists', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.bulletUpgradeResultId.set('bullet-result-1');

      component.onKeywordBulletPositionSelected({
        keyword: 'React',
        experienceIndex: 0,
      });
      component.onKeywordBulletPositionSelected({
        keyword: 'React',
        experienceIndex: null,
      });

      expect(component.keywordBulletPositions().has('React')).toBe(false);
      expect(apiService.saveUserOutput).toHaveBeenLastCalledWith(
        'bullet-result-1',
        expect.stringContaining('"keywordBulletPositions":[]'),
      );
    });
  });

  describe('loadStoredOptimization — restores keyword bullet positions', () => {
    it('restores keywordBulletPositions from BULLET_UPGRADE userEditedOutput', async () => {
      const bulletResult: OptimizationResultSummary = {
        id: 'bullet-result-1',
        promptType: PromptType.BULLET_UPGRADE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
          selectedKeywords: ['React'],
          keywordBulletPositions: [{ keyword: 'React', experienceIndex: 0 }],
        }),
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([bulletResult])),
      });

      expect(component.keywordBulletPositions()).toEqual(
        new Map([['React', 0]]),
      );
    });

    it('defaults keywordBulletPositions to an empty map when absent from stored state', async () => {
      const bulletResult: OptimizationResultSummary = {
        id: 'bullet-result-1',
        promptType: PromptType.BULLET_UPGRADE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
        }),
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi.fn().mockReturnValue(of([bulletResult])),
      });

      expect(component.keywordBulletPositions()).toEqual(new Map());
    });

    it('renders the correct pre-selected option in the position <select> after a full reload', async () => {
      const structuredData: CvStructuredData = {
        ...mockCvStructuredData,
        experience: [
          {
            company: 'Acme Corp',
            title: 'Frontend Developer',
            location: null,
            startDate: '2021-01',
            endDate: '2024-01',
            current: false,
            bullets: [],
          },
          {
            company: 'Beta Inc',
            title: 'Engineer',
            location: null,
            startDate: '2019-01',
            endDate: '2021-01',
            current: false,
            bullets: [],
          },
        ],
      };

      const keywordGapResult = {
        matchScore: 80,
        matchScoreBreakdown: {
          requiredMatched: 3,
          requiredTotal: 5,
          preferredMatched: 2,
          preferredTotal: 4,
        },
        matchedKeywords: [],
        missingKeywords: [
          {
            keyword: 'React',
            category: 'tools',
            importance: 'high',
            isRequired: true,
            candidateLikelyHas: true,
            evidenceFromResume: '',
            recommendation: "Add 'Built React apps.' to your experience.",
            suggestedPlacement: 'experience_bullet',
          },
        ],
        underweightedKeywords: [],
        fabricationWarnings: [],
        acronymIssues: [],
      };

      const keywordGapResultRow: OptimizationResultSummary = {
        id: 'keyword-gap-result-1',
        promptType: PromptType.KEYWORD_GAP,
        status: 'COMPLETED',
        userEditedOutput: null,
        structuredOutput: keywordGapResult,
      };

      const bulletResult: OptimizationResultSummary = {
        id: 'bullet-result-1',
        promptType: PromptType.BULLET_UPGRADE,
        status: 'COMPLETED',
        userEditedOutput: JSON.stringify({
          edits: [],
          selectedBullets: [],
          selectedMissingBullets: [],
          removedBullets: [],
          selectedKeywords: ['React'],
          keywordBulletPositions: [{ keyword: 'React', experienceIndex: 1 }],
        }),
        structuredOutput: null,
      };

      await createComponent({
        jobApplicationId: 'job-app-id-1',
        getOptimizationResults: vi
          .fn()
          .mockReturnValue(of([keywordGapResultRow, bulletResult])),
        getStructuredData: vi.fn().mockReturnValue(of({ data: structuredData })),
      });
      fixture.detectChanges();

      const select: HTMLSelectElement | null =
        fixture.nativeElement.querySelector('#kw-pos-React');
      if (select === null) throw new Error('Position select not found');
      expect(select.value).toBe('1');
      expect(select.selectedOptions[0].textContent).toContain('Beta Inc - Engineer');
    });
  });
});
