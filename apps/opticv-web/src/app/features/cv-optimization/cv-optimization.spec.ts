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
