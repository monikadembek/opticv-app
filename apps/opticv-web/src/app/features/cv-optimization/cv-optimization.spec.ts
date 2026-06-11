import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import type { CvDocumentListItem, CvStructuredData, JobApplication, JobApplicationWithCv, OptimizationResultSummary } from '@opticv/datatypes';
import type { CvTemplateId } from './cv-templates';
import { PromptType } from '@opticv/datatypes';
import type { JobSubmittedData } from './components/job-upload/job-upload';
import { CvOptimization } from './cv-optimization';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';
import { CvApiService } from '../dashboard/services/cv-api.service';

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
  contact: { name: 'Test User', email: 'test@example.com', phone: null, location: null, linkedin: null, website: null },
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

function makeActivatedRoute(jobApplicationId: string | null = null) {
  return {
    snapshot: {
      paramMap: convertToParamMap(
        jobApplicationId ? { jobApplicationId } : {},
      ),
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
    streamOptimizationEvents: ReturnType<typeof vi.fn>;
    retryOptimization: ReturnType<typeof vi.fn>;
  };
  let jobApplicationApiService: {
    getJobApplication: ReturnType<typeof vi.fn>;
  };
  let cvApiService: {
    downloadCv: ReturnType<typeof vi.fn>;
  };

  interface CreateComponentOptions {
    jobApplicationId?: string | null;
    getOptimizationResults?: ReturnType<typeof vi.fn>;
    getStructuredData?: ReturnType<typeof vi.fn>;
  }

  async function createComponent(options: CreateComponentOptions = {}) {
    const {
      jobApplicationId = null,
      getOptimizationResults = vi.fn().mockReturnValue(of([])),
      getStructuredData = vi.fn().mockReturnValue(of({ data: mockCvStructuredData })),
    } = options;

    TestBed.resetTestingModule();
    apiService = {
      cvList: makeCvListResource(),
      reloadCvList: vi.fn(),
      createJobApplication: vi.fn(),
      extractCvData: vi.fn(),
      getStructuredData,
      getOptimizationResults,
      runSingleOptimizationProcess: vi.fn().mockReturnValue(of({ runId: 'run-id-1' })),
      streamOptimizationEvents: vi.fn().mockReturnValue(of()),
      retryOptimization: vi.fn(),
    };
    jobApplicationApiService = {
      getJobApplication: vi.fn().mockReturnValue(of(mockJobApplicationWithCv)),
    };
    cvApiService = {
      downloadCv: vi.fn().mockReturnValue(of({ url: 'https://signed.url' })),
    };

    await TestBed.configureTestingModule({
      imports: [CvOptimization],
      providers: [
        { provide: CvOptimizationApiService, useValue: apiService },
        { provide: JobApplicationApiService, useValue: jobApplicationApiService },
        { provide: CvApiService, useValue: cvApiService },
        { provide: ActivatedRoute, useValue: makeActivatedRoute(jobApplicationId) },
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
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent?.trim()).toBe('CV Optimization');
  });

  it('should render the job-upload component', () => {
    const jobUpload = fixture.nativeElement.querySelector('app-job-upload');
    expect(jobUpload).toBeTruthy();
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
        new Map([[PromptType.RESUME_AUTOPSY, { promptType: PromptType.RESUME_AUTOPSY, status: 'completed', result }]]),
      );
      expect(component.autopsyResult()).toEqual(result);
    });

    it('keywordGapResult returns null when no result exists', () => {
      expect(component.keywordGapResult()).toBeNull();
    });

    it('keywordGapResult returns typed result when valid KeywordGapResult is stored', () => {
      const result = {
        matchScore: 80,
        matchScoreBreakdown: { requiredMatched: 3, requiredTotal: 5, preferredMatched: 2, preferredTotal: 4 },
        matchedKeywords: [],
        missingKeywords: [],
        underweightedKeywords: [],
        fabricationWarnings: [],
        acronymIssues: [],
      };
      component.results.set(
        new Map([[PromptType.KEYWORD_GAP, { promptType: PromptType.KEYWORD_GAP, status: 'completed', result }]]),
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
        new Map([[PromptType.SUMMARY_REWRITE, { promptType: PromptType.SUMMARY_REWRITE, status: 'completed', result }]]),
      );
      expect(component.summaryRewriteResult()).toEqual(result);
    });

    it('summaryRewriteResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([[PromptType.SUMMARY_REWRITE, { promptType: PromptType.SUMMARY_REWRITE, status: 'completed', result: { foo: 'bar' } }]]),
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
        verbDiversityCheck: { uniqueVerbsUsed: 4, totalBullets: 6, diverseEnough: true },
      };
      component.results.set(
        new Map([[PromptType.BULLET_UPGRADE, { promptType: PromptType.BULLET_UPGRADE, status: 'completed', result }]]),
      );
      expect(component.bulletUpgradeResult()).toEqual(result);
    });

    it('bulletUpgradeResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([[PromptType.BULLET_UPGRADE, { promptType: PromptType.BULLET_UPGRADE, status: 'completed', result: { foo: 'bar' } }]]),
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
        new Map([[PromptType.COVER_LETTER, { promptType: PromptType.COVER_LETTER, status: 'completed', result }]]),
      );
      expect(component.coverLetterResult()).toEqual(result);
    });

    it('coverLetterResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([[PromptType.COVER_LETTER, { promptType: PromptType.COVER_LETTER, status: 'completed', result: { foo: 'bar' } }]]),
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
        new Map([[PromptType.COVER_LETTER, { promptType: PromptType.COVER_LETTER, status: 'completed', result }]]),
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
        new Map([[PromptType.INTERVIEW_PREP, { promptType: PromptType.INTERVIEW_PREP, status: 'completed', result }]]),
      );
      expect(component.interviewPrepResult()).toEqual(result);
    });

    it('interviewPrepResult returns null when stored result has wrong shape', () => {
      component.results.set(
        new Map([[PromptType.INTERVIEW_PREP, { promptType: PromptType.INTERVIEW_PREP, status: 'completed', result: { foo: 'bar' } }]]),
      );
      expect(component.interviewPrepResult()).toBeNull();
    });

    it('interviewPrepResult returns null when preparationTips is missing', () => {
      component.results.set(
        new Map([[PromptType.INTERVIEW_PREP, { promptType: PromptType.INTERVIEW_PREP, status: 'completed', result: { questions: [] } }]]),
      );
      expect(component.interviewPrepResult()).toBeNull();
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

      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledTimes(6);
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.KEYWORD_GAP,
      );
      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.RESUME_AUTOPSY,
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

    it('sets isProcessing to true for the first 3 concurrent prompt types as soon as their streams open', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobSubmittedData);

      const processingValues = Array.from(component.isProcessing().values());
      expect(processingValues.filter(Boolean).length).toBeGreaterThanOrEqual(3);
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
      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(false);
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

      expect(component.results().get(PromptType.KEYWORD_GAP)).toEqual(failedEvent);
      expect(component.isProcessing().get(PromptType.KEYWORD_GAP)).toBe(false);
    });

    it('stores the result from an active prompt SSE event', () => {
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(sseSubject.asObservable());

      component.runOptimization(mockJobSubmittedData);

      const bulletEvent: SseJobCompleteEvent = {
        promptType: PromptType.BULLET_UPGRADE,
        status: 'completed',
        result: { positions: [], missingBulletSuggestions: [], overallNotes: '', verbDiversityCheck: {} },
      };

      sseSubject.next(bulletEvent);

      expect(component.results().get(PromptType.BULLET_UPGRADE)).toEqual(bulletEvent);
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
          [PromptType.KEYWORD_GAP, { promptType: PromptType.KEYWORD_GAP, status: 'failed', error: 'timeout' }],
        ]),
      );
      expect(component.retryablePromptTypes().has(PromptType.KEYWORD_GAP)).toBe(true);
    });

    it('includes a prompt type that completed but returned an invalid result shape', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [PromptType.RESUME_AUTOPSY, { promptType: PromptType.RESUME_AUTOPSY, status: 'completed', result: { bad: 'data' } }],
        ]),
      );
      expect(component.retryablePromptTypes().has(PromptType.RESUME_AUTOPSY)).toBe(true);
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
          [PromptType.RESUME_AUTOPSY, { promptType: PromptType.RESUME_AUTOPSY, status: 'completed', result: validResult }],
        ]),
      );
      expect(component.retryablePromptTypes().has(PromptType.RESUME_AUTOPSY)).toBe(false);
    });

    it('does not include a prompt type that is currently processing', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      component.results.set(
        new Map([
          [PromptType.KEYWORD_GAP, { promptType: PromptType.KEYWORD_GAP, status: 'failed', error: 'timeout' }],
        ]),
      );
      component.isProcessing.set(new Map([[PromptType.KEYWORD_GAP, true]]));
      expect(component.retryablePromptTypes().has(PromptType.KEYWORD_GAP)).toBe(false);
    });
  });

  describe('selectedTemplate', () => {
    it('defaults to ats', () => {
      expect(component.selectedTemplate()).toBe('ats' satisfies CvTemplateId);
    });

    it('can be set to modern', () => {
      component.selectedTemplate.set('modern');
      expect(component.selectedTemplate()).toBe('modern');
    });

    it('can be set to executive', () => {
      component.selectedTemplate.set('executive');
      expect(component.selectedTemplate()).toBe('executive');
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

    it('returns true when SUMMARY_REWRITE is processing (it is an active prompt)', () => {
      component.isProcessing.set(new Map([[PromptType.SUMMARY_REWRITE, true]]));
      expect(component.isProcessingAny()).toBe(true);
    });

    it('returns false when all active prompts finish processing', () => {
      component.isProcessing.set(new Map([
        [PromptType.KEYWORD_GAP, false],
        [PromptType.RESUME_AUTOPSY, false],
        [PromptType.BULLET_UPGRADE, false],
      ]));
      expect(component.isProcessingAny()).toBe(false);
    });
  });

  describe('canExportCv', () => {
    it('returns false when no CV data is available', () => {
      expect(component.canExportCv()).toBe(false);
    });

    it('returns false when CV data exists but no selection has been made', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      expect(component.canExportCv()).toBe(false);
    });

    it('returns true when a summary angle is selected and not processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.selections.set({
        selectedSummaryAngle: 'achievement_led',
        customSummaryText: null,
        selectedBullets: [],
        selectedKeywords: [],
      });
      expect(component.canExportCv()).toBe(true);
    });

    it('returns false when a selection is made but an active prompt is still processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.selections.set({
        selectedSummaryAngle: 'achievement_led',
        customSummaryText: null,
        selectedBullets: [],
        selectedKeywords: [],
      });
      component.isProcessing.set(new Map([[PromptType.KEYWORD_GAP, true]]));
      expect(component.canExportCv()).toBe(false);
    });

    it('returns true once processing finishes and a selection exists', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.selections.set({
        selectedSummaryAngle: 'achievement_led',
        customSummaryText: null,
        selectedBullets: [],
        selectedKeywords: [],
      });
      component.isProcessing.set(new Map([[PromptType.KEYWORD_GAP, false]]));
      expect(component.canExportCv()).toBe(true);
    });

    it('returns true in stored mode when CV data is available and not processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.isStoredMode.set(true);
      expect(component.canExportCv()).toBe(true);
    });

    it('returns false in stored mode when an active prompt is still processing', () => {
      component.cvStructuredData.set(mockCvStructuredData);
      component.isStoredMode.set(true);
      component.isProcessing.set(new Map([[PromptType.RESUME_AUTOPSY, true]]));
      expect(component.canExportCv()).toBe(false);
    });
  });

  describe('retryOptimization', () => {
    it('does nothing when jobApplicationId is null', () => {
      component.retryOptimization(PromptType.RESUME_AUTOPSY);
      expect(apiService.runSingleOptimizationProcess).not.toHaveBeenCalled();
    });

    it('sets isProcessing to true for the retried prompt type immediately', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.retryOptimization(PromptType.RESUME_AUTOPSY);

      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(true);
    });

    it('calls runSingleOptimizationProcess with the stored jobApplicationId and promptType', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.retryOptimization(PromptType.KEYWORD_GAP);

      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
        mockJobApplication.id,
        PromptType.KEYWORD_GAP,
      );
    });

    it('updates results and clears isProcessing when the retry SSE event arrives', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(sseSubject.asObservable());

      component.retryOptimization(PromptType.RESUME_AUTOPSY);

      const event: SseJobCompleteEvent = {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
        result: { overallScore: 88, predictedScoreAfterFixes: 95, topPriority: 'Keywords', summary: 'Good', issues: [], strengths: [] },
      };
      sseSubject.next(event);

      expect(component.results().get(PromptType.RESUME_AUTOPSY)).toEqual(event);
      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(false);
    });

    it('clears isProcessing on stream error', () => {
      component.jobApplicationId.set(mockJobApplication.id);
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(sseSubject.asObservable());

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
      expect(component.results().get(PromptType.RESUME_AUTOPSY)?.result).toEqual(
        completedResult.structuredOutput,
      );
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
        getOptimizationResults: vi.fn().mockReturnValue(
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

      expect(component.loadError()).toBe('Failed to load optimization. Please try again.');
    });
  });

  describe('hasPartialStoredResults', () => {
    it('returns false when not in stored mode', () => {
      expect(component.hasPartialStoredResults()).toBe(false);
    });

    it('returns true in stored mode when at least one active prompt has no result', () => {
      component.isStoredMode.set(true);
      component.results.set(new Map([[PromptType.KEYWORD_GAP, { promptType: PromptType.KEYWORD_GAP, status: 'completed' }]]));
      expect(component.hasPartialStoredResults()).toBe(true);
    });

    it('returns false in stored mode when all active prompts have results', () => {
      component.isStoredMode.set(true);
      component.results.set(new Map([
        [PromptType.KEYWORD_GAP, { promptType: PromptType.KEYWORD_GAP, status: 'completed' }],
        [PromptType.RESUME_AUTOPSY, { promptType: PromptType.RESUME_AUTOPSY, status: 'completed' }],
        [PromptType.BULLET_UPGRADE, { promptType: PromptType.BULLET_UPGRADE, status: 'completed' }],
        [PromptType.SUMMARY_REWRITE, { promptType: PromptType.SUMMARY_REWRITE, status: 'completed' }],
        [PromptType.COVER_LETTER, { promptType: PromptType.COVER_LETTER, status: 'completed' }],
        [PromptType.INTERVIEW_PREP, { promptType: PromptType.INTERVIEW_PREP, status: 'completed' }],
      ]));
      expect(component.hasPartialStoredResults()).toBe(false);
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
      component.jobApplication.set({ ...mockJobApplicationWithCv, cvDocument: null as any });

      expect(() => component.openOriginalCv()).not.toThrow();
      expect(cvApiService.downloadCv).not.toHaveBeenCalled();
    });

    it('does nothing when jobApplication is null', () => {
      component.jobApplication.set(null);

      expect(() => component.openOriginalCv()).not.toThrow();
      expect(cvApiService.downloadCv).not.toHaveBeenCalled();
    });
  });
});
