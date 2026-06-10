import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { JobApplicationListItem, JobApplicationWithCv } from '@opticv/datatypes';
import { JobApplicationApiService } from './job-application-api.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const mockListItem: JobApplicationListItem = {
  id: 'app-id-1',
  userId: 'user-1',
  cvDocumentId: 'cv-id-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  atsScore: 85,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  cvDocument: { id: 'cv-id-1', fileName: 'cv.pdf' },
};

const mockJobApplicationWithCv: JobApplicationWithCv = {
  id: 'app-id-1',
  userId: 'user-1',
  cvDocumentId: 'cv-id-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build Angular apps',
  atsScore: 85,
  notes: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  cvDocument: { id: 'cv-id-1', fileName: 'cv.pdf' },
};

describe('JobApplicationApiService', () => {
  let service: JobApplicationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JobApplicationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getJobApplications', () => {
    it('GETs /api/job-applications and returns paginated list', () => {
      let result: { data: JobApplicationListItem[]; total: number } | undefined;

      service.getJobApplications().subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/job-applications`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: [mockListItem], total: 1 });

      expect(result).toEqual({ data: [mockListItem], total: 1 });
    });

    it('returns empty data array when there are no job applications', () => {
      let result: { data: JobApplicationListItem[]; total: number } | undefined;

      service.getJobApplications().subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/job-applications`);
      req.flush({ data: [], total: 0 });

      expect(result).toEqual({ data: [], total: 0 });
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.getJobApplications().subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/job-applications`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('getJobApplication', () => {
    it('GETs /api/job-applications/:id and returns the job application with cv', () => {
      let result: JobApplicationWithCv | undefined;

      service.getJobApplication('app-id-1').subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/job-applications/app-id-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockJobApplicationWithCv);

      expect(result).toEqual(mockJobApplicationWithCv);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .getJobApplication('app-id-1')
        .subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/job-applications/app-id-1`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('deleteJobApplication', () => {
    it('DELETEs /api/job-applications/:id', () => {
      let completed = false;

      service
        .deleteJobApplication('app-id-1')
        .subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/job-applications/app-id-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(completed).toBe(true);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .deleteJobApplication('app-id-1')
        .subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/job-applications/app-id-1`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(errorReceived).toBe(true);
    });
  });
});
