import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CvDocumentListItem, JobApplicationResponse } from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  CreateJobApplicationPayload,
} from './cv-optimization-api.service';
import { environment } from '../../../../environments/environment';

const CV_URL = `${environment.apiUrl}/cv`;
const JOB_APPS_URL = `${environment.apiUrl}/job-applications`;
const CV_EXTRACT_URL = (id: string) => `${environment.apiUrl}/cv/${id}/extract`;

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

describe('CvOptimizationApiService', () => {
  let service: CvOptimizationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
});
