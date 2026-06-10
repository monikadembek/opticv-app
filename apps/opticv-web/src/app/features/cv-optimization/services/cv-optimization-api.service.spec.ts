import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import type { CvDocumentListItem, JobApplicationResponse } from '@opticv/datatypes';
import { PromptType } from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  CreateJobApplicationPayload,
  SseJobCompleteEvent,
} from './cv-optimization-api.service';
import { environment } from '../../../../environments/environment';
import { Supabase } from '../../../core/auth/services/supabase';

const CV_URL = `${environment.apiUrl}/cv`;
const JOB_APPS_URL = `${environment.apiUrl}/job-applications`;
const CV_EXTRACT_URL = (id: string) => `${environment.apiUrl}/cv/${id}/extract`;
const CV_STRUCTURED_DATA_URL = (id: string) => `${environment.apiUrl}/cv/${id}/structured-data`;
const RUN_FULL_URL = (jobAppId: string) =>
  `${environment.apiUrl}/optimizations/job-applications/${jobAppId}/run`;
const RUN_SINGLE_URL = (jobAppId: string, promptType: string) =>
  `${environment.apiUrl}/optimizations/job-applications/${jobAppId}/run/${promptType}`;
const STREAM_URL = (jobAppId: string, runId: string, token: string) =>
  `${environment.apiUrl}/optimizations/job-applications/${jobAppId}/stream?runId=${runId}&token=${token}`;

const mockCv: CvDocumentListItem = {
  id: 'cv-id-1',
  fileName: 'my-cv.pdf',
  fileSize: 2048,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01').toISOString(),
  parsedText: null,
  parseStatus: 'COMPLETED',
};

const mockPayload: CreateJobApplicationPayload = {
  cvDocumentId: 'cv-id-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build amazing UIs',
};

const mockJobApplicationResponse: JobApplicationResponse = {
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

const mockSupabase = {
  currentSession: vi.fn().mockReturnValue({ access_token: 'test-token' }),
};

describe('CvOptimizationApiService', () => {
  let service: CvOptimizationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Supabase, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(CvOptimizationApiService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    httpMock.expectOne(CV_URL).flush([]);
    expect(service).toBeTruthy();
  });

  describe('cvList (httpResource)', () => {
    it('GETs the cv endpoint on initialization', () => {
      const req = httpMock.expectOne(CV_URL);
      expect(req.request.method).toBe('GET');
      req.flush([mockCv]);
    });

    it('exposes cvList as readonly resource', () => {
      httpMock.expectOne(CV_URL).flush([mockCv]);
      expect(service.cvList).toBeDefined();
    });
  });

  describe('reloadCvList', () => {
    it('can be called without throwing', () => {
      httpMock.expectOne(CV_URL).flush([mockCv]);
      expect(() => service.reloadCvList()).not.toThrow();
      httpMock.match(CV_URL).forEach((r) => r.flush([mockCv]));
    });
  });

  describe('createJobApplication', () => {
    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);
    });

    it('POSTs to the job-applications endpoint with the payload', () => {
      let result: JobApplicationResponse | undefined;

      service
        .createJobApplication(mockPayload)
        .subscribe((res) => (result = res));

      const req = httpMock.expectOne(JOB_APPS_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockPayload);
      req.flush(mockJobApplicationResponse);

      expect(result).toEqual(mockJobApplicationResponse);
    });

    it('includes optional notes in the payload', () => {
      const payloadWithNotes: CreateJobApplicationPayload = {
        ...mockPayload,
        notes: 'Referral from a friend',
      };

      service.createJobApplication(payloadWithNotes).subscribe();

      const req = httpMock.expectOne(JOB_APPS_URL);
      expect(req.request.body.notes).toBe('Referral from a friend');
      req.flush(mockJobApplicationResponse);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .createJobApplication(mockPayload)
        .subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(JOB_APPS_URL);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('extractCvData', () => {
    const cvId = 'cv-id-1';

    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);
    });

    it('POSTs to /api/cv/:id/extract with an empty body', () => {
      service.extractCvData(cvId).subscribe();

      const req = httpMock.expectOne(CV_EXTRACT_URL(cvId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ data: {} });
    });

    it('emits the response and completes on success', () => {
      const mockResponse = { data: { name: 'John' } };
      let emitted: unknown = undefined;
      let completed = false;

      service.extractCvData(cvId).subscribe({
        next: (v) => (emitted = v),
        complete: () => (completed = true),
      });

      httpMock.expectOne(CV_EXTRACT_URL(cvId)).flush(mockResponse);

      expect(emitted).toEqual(mockResponse);
      expect(completed).toBe(true);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.extractCvData(cvId).subscribe({ error: () => (errorReceived = true) });

      httpMock
        .expectOne(CV_EXTRACT_URL(cvId))
        .flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('getStructuredData', () => {
    const cvId = 'cv-id-1';

    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);
    });

    it('GETs /cv/:id/structured-data', () => {
      service.getStructuredData(cvId).subscribe();

      const req = httpMock.expectOne(CV_STRUCTURED_DATA_URL(cvId));
      expect(req.request.method).toBe('GET');
      req.flush({ data: {} });
    });

    it('emits the response and completes on success', () => {
      const mockResponse = { data: { contact: { name: 'Jane' } } };
      let emitted: unknown;
      let completed = false;

      service.getStructuredData(cvId).subscribe({
        next: (v) => (emitted = v),
        complete: () => (completed = true),
      });

      httpMock.expectOne(CV_STRUCTURED_DATA_URL(cvId)).flush(mockResponse);

      expect(emitted).toEqual(mockResponse);
      expect(completed).toBe(true);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.getStructuredData(cvId).subscribe({ error: () => (errorReceived = true) });

      httpMock
        .expectOne(CV_STRUCTURED_DATA_URL(cvId))
        .flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('runFullOptimizationProcess', () => {
    const jobAppId = 'job-app-id-1';

    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);
    });

    it('POSTs to the run endpoint with an empty body', () => {
      service.runFullOptimizationProcess(jobAppId).subscribe();

      const req = httpMock.expectOne(RUN_FULL_URL(jobAppId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ runId: 'run-id-1' });
    });

    it('emits the runId on success', () => {
      let result: { runId: string } | undefined;

      service.runFullOptimizationProcess(jobAppId).subscribe((r) => (result = r));

      httpMock.expectOne(RUN_FULL_URL(jobAppId)).flush({ runId: 'run-id-1' });

      expect(result).toEqual({ runId: 'run-id-1' });
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .runFullOptimizationProcess(jobAppId)
        .subscribe({ error: () => (errorReceived = true) });

      httpMock
        .expectOne(RUN_FULL_URL(jobAppId))
        .flush('Server Error', { status: 500, statusText: 'Server Error' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('runSingleOptimizationProcess', () => {
    const jobAppId = 'job-app-id-1';
    const promptType = PromptType.RESUME_AUTOPSY;

    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);
    });

    it('POSTs to the run/:promptType endpoint with an empty body', () => {
      service.runSingleOptimizationProcess(jobAppId, promptType).subscribe();

      const req = httpMock.expectOne(RUN_SINGLE_URL(jobAppId, promptType));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ runId: 'run-id-2' });
    });

    it('emits the runId on success', () => {
      let result: { runId: string } | undefined;

      service
        .runSingleOptimizationProcess(jobAppId, promptType)
        .subscribe((r) => (result = r));

      httpMock
        .expectOne(RUN_SINGLE_URL(jobAppId, promptType))
        .flush({ runId: 'run-id-2' });

      expect(result).toEqual({ runId: 'run-id-2' });
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .runSingleOptimizationProcess(jobAppId, promptType)
        .subscribe({ error: () => (errorReceived = true) });

      httpMock
        .expectOne(RUN_SINGLE_URL(jobAppId, promptType))
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('streamOptimizationEvents', () => {
    const jobAppId = 'job-app-id-1';
    const runId = 'run-id-1';
    const token = 'test-token';

    let mockEventSource: {
      addEventListener: ReturnType<typeof vi.fn>;
      onerror: ((e: Event) => void) | null;
      close: ReturnType<typeof vi.fn>;
    };
    let EventSourceSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      httpMock.expectOne(CV_URL).flush([]);

      mockEventSource = {
        addEventListener: vi.fn(),
        onerror: null,
        close: vi.fn(),
      };

      // Use a class constructor mock so `new EventSource(url)` returns our mockEventSource
      const instance = mockEventSource;
      EventSourceSpy = vi.fn(function (this: unknown) {
        Object.assign(this as object, instance);
      });
      // Make onerror writable on the prototype so the service can assign es.onerror
      EventSourceSpy.prototype = mockEventSource;
      vi.stubGlobal('EventSource', EventSourceSpy);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns EMPTY on the server platform (non-browser)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Supabase, useValue: mockSupabase },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const serverService = TestBed.inject(CvOptimizationApiService);
      TestBed.flushEffects();
      TestBed.inject(HttpTestingController).expectOne(CV_URL).flush([]);

      let completed = false;
      serverService
        .streamOptimizationEvents(jobAppId, runId)
        .subscribe({ complete: () => (completed = true) });

      expect(completed).toBe(true);
    });

    it('constructs EventSource with the correct URL including token', () => {
      service.streamOptimizationEvents(jobAppId, runId).subscribe();

      expect(EventSourceSpy).toHaveBeenCalledWith(
        STREAM_URL(jobAppId, runId, token),
      );
    });

    it('emits the parsed event data on job-complete and completes', () => {
      const mockEvent: SseJobCompleteEvent = {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
        result: { score: 85 },
      };

      let emitted: SseJobCompleteEvent | undefined;
      let completed = false;

      service.streamOptimizationEvents(jobAppId, runId).subscribe({
        next: (e) => (emitted = e),
        complete: () => (completed = true),
      });

      const [eventName, handler] = mockEventSource.addEventListener.mock.calls[0];
      expect(eventName).toBe('job-complete');

      handler({ data: JSON.stringify(mockEvent) } as MessageEvent);

      expect(emitted).toEqual(mockEvent);
      expect(completed).toBe(true);
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('errors the observable and closes EventSource on onerror', () => {
      let errorReceived = false;

      service
        .streamOptimizationEvents(jobAppId, runId)
        .subscribe({ error: () => (errorReceived = true) });

      // The service sets es.onerror — read it back from the constructed instance
      const esInstance = EventSourceSpy.mock.instances[0] as typeof mockEventSource;
      esInstance.onerror!(new Event('error'));

      expect(errorReceived).toBe(true);
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('closes EventSource when the subscription is unsubscribed', () => {
      const sub = service.streamOptimizationEvents(jobAppId, runId).subscribe();

      sub.unsubscribe();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('uses an empty string token when there is no active session', () => {
      mockSupabase.currentSession.mockReturnValueOnce(null);

      service.streamOptimizationEvents(jobAppId, runId).subscribe();

      expect(EventSourceSpy).toHaveBeenCalledWith(
        STREAM_URL(jobAppId, runId, ''),
      );
    });
  });
});
