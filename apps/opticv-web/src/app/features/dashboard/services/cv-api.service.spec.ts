import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvApiService } from './cv-api.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const mockFile: CvDocumentListItem = {
  id: 'doc-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01').toISOString(),
  parsedText: null,
  parseStatus: 'COMPLETED',
};

describe('CvApiService', () => {
  let service: CvApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CvApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserCvs', () => {
    it('GETs /api/cv and returns a list of CvDocumentListItem', () => {
      let result: CvDocumentListItem[] | undefined;

      service.getUserCvs().subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/cv`);
      expect(req.request.method).toBe('GET');
      req.flush([mockFile]);

      expect(result).toEqual([mockFile]);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.getUserCvs().subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/cv`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('downloadCv', () => {
    it('GETs /api/cv/:id/download and returns a url', () => {
      let result: { url: string } | undefined;

      service.downloadCv('doc-id').subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/cv/doc-id/download`);
      expect(req.request.method).toBe('GET');
      req.flush({ url: 'https://signed.url/file.pdf' });

      expect(result).toEqual({ url: 'https://signed.url/file.pdf' });
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service
        .downloadCv('doc-id')
        .subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/cv/doc-id/download`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(errorReceived).toBe(true);
    });
  });

  describe('deleteCv', () => {
    it('DELETEs /api/cv/:id', () => {
      let completed = false;

      service.deleteCv('doc-id').subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/cv/doc-id`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(completed).toBe(true);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.deleteCv('doc-id').subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne(`${API}/cv/doc-id`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(errorReceived).toBe(true);
    });
  });
});
