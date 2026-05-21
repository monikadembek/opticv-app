import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, Subject, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import type { CvDocumentListItem, JobApplication } from '@opticv/datatypes';
import { PromptType } from '@opticv/datatypes';
import { CvOptimization } from './cv-optimization';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';

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

const ALL_PROMPT_TYPES = Object.values(PromptType);

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
    runSingleOptimizationProcess: ReturnType<typeof vi.fn>;
    streamOptimizationEvents: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiService = {
      cvList: makeCvListResource(),
      reloadCvList: vi.fn(),
      createJobApplication: vi.fn(),
      extractCvData: vi.fn(),
      runSingleOptimizationProcess: vi.fn().mockReturnValue(of({ runId: 'run-id-1' })),
      streamOptimizationEvents: vi.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [CvOptimization],
      providers: [
        { provide: CvOptimizationApiService, useValue: apiService },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvOptimization);
    component = fixture.componentInstance;
    fixture.detectChanges();
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

      component.runOptimization(mockJobApplication);

      expect(component.results().size).toBe(0);
    });

    it('calls runSingleOptimizationProcess for every PromptType', () => {
      component.runOptimization(mockJobApplication);

      expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledTimes(
        ALL_PROMPT_TYPES.length,
      );
      for (const promptType of ALL_PROMPT_TYPES) {
        expect(apiService.runSingleOptimizationProcess).toHaveBeenCalledWith(
          mockJobApplication.id,
          promptType,
        );
      }
    });

    it('calls streamOptimizationEvents with the jobApplicationId and runId from runSingle', () => {
      apiService.runSingleOptimizationProcess.mockReturnValue(
        of({ runId: 'run-abc' }),
      );

      component.runOptimization(mockJobApplication);

      expect(apiService.streamOptimizationEvents).toHaveBeenCalledWith(
        mockJobApplication.id,
        'run-abc',
      );
    });

    it('sets isProcessing to true for a prompt type as soon as its stream opens', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobApplication);

      expect(component.isProcessing().get(PromptType.RESUME_AUTOPSY)).toBe(true);
    });

    it('updates results and clears isProcessing on a completed SSE event', () => {
      const sseSubject = new Subject<SseJobCompleteEvent>();
      apiService.streamOptimizationEvents.mockReturnValue(
        sseSubject.asObservable(),
      );

      component.runOptimization(mockJobApplication);

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

      component.runOptimization(mockJobApplication);

      const failedEvent: SseJobCompleteEvent = {
        promptType: PromptType.KEYWORD_GAP,
        status: 'failed',
        error: 'AI service timeout',
      };

      sseSubject.next(failedEvent);

      expect(component.results().get(PromptType.KEYWORD_GAP)).toEqual(failedEvent);
      expect(component.isProcessing().get(PromptType.KEYWORD_GAP)).toBe(false);
    });

    it('accumulates results for multiple prompt types independently', () => {
      const subjects = new Map<PromptType, Subject<SseJobCompleteEvent>>();
      apiService.streamOptimizationEvents.mockImplementation(() => {
        const s = new Subject<SseJobCompleteEvent>();
        // store the last created subject so we can push to it per promptType
        subjects.set(
          apiService.runSingleOptimizationProcess.mock.lastCall?.[1],
          s,
        );
        return s.asObservable();
      });

      component.runOptimization(mockJobApplication);

      const autopsyEvent: SseJobCompleteEvent = {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
        result: { ats: 80 },
      };
      const keywordEvent: SseJobCompleteEvent = {
        promptType: PromptType.KEYWORD_GAP,
        status: 'completed',
        result: { gap: ['TypeScript'] },
      };

      subjects.get(PromptType.RESUME_AUTOPSY)?.next(autopsyEvent);
      subjects.get(PromptType.KEYWORD_GAP)?.next(keywordEvent);

      expect(component.results().get(PromptType.RESUME_AUTOPSY)).toEqual(
        autopsyEvent,
      );
      expect(component.results().get(PromptType.KEYWORD_GAP)).toEqual(
        keywordEvent,
      );
    });

    it('a second call to runOptimization discards results from the first', () => {
      apiService.streamOptimizationEvents.mockReturnValue(NEVER);

      component.runOptimization(mockJobApplication);
      // Manually poke in a result that should be cleared on re-run
      component.results.update((m) =>
        new Map(m).set(PromptType.RESUME_AUTOPSY, {
          promptType: PromptType.RESUME_AUTOPSY,
          status: 'completed',
        }),
      );

      component.runOptimization(mockJobApplication);

      expect(component.results().size).toBe(0);
    });
  });
});
