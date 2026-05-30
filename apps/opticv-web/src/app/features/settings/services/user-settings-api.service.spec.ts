import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserSettingsApiService } from './user-settings-api.service';

describe('UserSettingsApiService', () => {
  let service: UserSettingsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserSettingsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── userProfile resource ────────────────────────────────────────────────

  describe('userProfile', () => {
    it('exposes a readonly resource defaulting to null', () => {
      expect(service.userProfile.value()).toBeNull();
    });

    it('exposes isLoading as a readable signal', () => {
      expect(typeof service.userProfile.isLoading()).toBe('boolean');
    });

    it('exposes hasValue as a readable signal', () => {
      expect(typeof service.userProfile.hasValue()).toBe('boolean');
    });

    it('exposes error as a readable signal', () => {
      // No error yet — value is undefined or null
      const err = service.userProfile.error();
      expect(err === null || err === undefined).toBe(true);
    });
  });

  // ─── deleteAccount ───────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('DELETEs /api/users/me', () => {
      let completed = false;

      service.deleteAccount().subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne('http://localhost:3000/api/users/me');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(completed).toBe(true);
    });

    it('propagates HTTP errors', () => {
      let errorReceived = false;

      service.deleteAccount().subscribe({ error: () => (errorReceived = true) });

      const req = httpMock.expectOne('http://localhost:3000/api/users/me');
      req.flush('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });

      expect(errorReceived).toBe(true);
    });
  });
});
