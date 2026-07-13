import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { UploadCvResponse } from '@opticv/datatypes';

import { CvUploadApiService } from './cv-upload-api.service';
import { UserSettingsApiService } from '../../../core/services/user-settings-api.service';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('CvUploadApiService', () => {
  let service: CvUploadApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserSettingsApiService, useValue: {} },
      ],
    });
    service = TestBed.inject(CvUploadApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('uploadCv', () => {
    it('should POST to /api/cv/upload', () => {
      const mockFile = new File(['content'], 'resume.pdf', {
        type: 'application/pdf',
      });
      const mockResponse: UploadCvResponse = {
        id: 'cv-123',
        fileName: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageKey: 'uploads/resume.pdf',
        createdAt: new Date().toISOString(),
        parseStatus: 'COMPLETED',
      };

      service.uploadCv(mockFile).subscribe();

      const req = httpMock.expectOne(`${API}/cv/upload`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should send the file as FormData with key "file"', () => {
      const mockFile = new File(['content'], 'resume.pdf', {
        type: 'application/pdf',
      });

      service.uploadCv(mockFile).subscribe();

      const req = httpMock.expectOne(`${API}/cv/upload`);
      const body = req.request.body as FormData;
      expect(body.get('file')).toBe(mockFile);
      req.flush({});
    });

    it('should return the response from the server', () => {
      const mockFile = new File(['content'], 'resume.pdf', {
        type: 'application/pdf',
      });
      const mockResponse: UploadCvResponse = {
        id: 'cv-abc',
        fileName: 'resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageKey: 'uploads/resume.pdf',
        createdAt: new Date().toISOString(),
        parseStatus: 'COMPLETED',
      };
      let result: UploadCvResponse | undefined;

      service.uploadCv(mockFile).subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${API}/cv/upload`);
      req.flush(mockResponse);

      expect(result).toEqual(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      const mockFile = new File(['content'], 'resume.pdf', {
        type: 'application/pdf',
      });
      let errorReceived = false;

      service.uploadCv(mockFile).subscribe({
        error: () => (errorReceived = true),
      });

      const req = httpMock.expectOne(`${API}/cv/upload`);
      req.flush('Upload failed', { status: 500, statusText: 'Server Error' });

      expect(errorReceived).toBe(true);
    });
  });
});
