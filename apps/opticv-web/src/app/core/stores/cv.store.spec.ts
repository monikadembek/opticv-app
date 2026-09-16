import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { CvStore } from './cv.store';
import { CvApiService } from '../services/cv-api.service';
import type { CvDocumentListItem } from '@opticv/datatypes';

const mockCvs: CvDocumentListItem[] = [
  { id: 'cv-1' } as CvDocumentListItem,
  { id: 'cv-2' } as CvDocumentListItem,
];

function createCvApiServiceMock() {
  return {
    getUserCvs: vi.fn().mockReturnValue(of(mockCvs)),
  };
}

describe('CvStore', () => {
  let cvApiServiceMock: ReturnType<typeof createCvApiServiceMock>;

  async function setup() {
    cvApiServiceMock = createCvApiServiceMock();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CvApiService, useValue: cvApiServiceMock }],
    });

    return TestBed.inject(CvStore);
  }

  it('should initialise with empty state', async () => {
    const store = await setup();

    expect(store.cvList()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasCv()).toBe(false);
  });

  describe('updateCvList', () => {
    it('sets the cv list', async () => {
      const store = await setup();

      store.updateCvList(mockCvs);

      expect(store.cvList()).toEqual(mockCvs);
      expect(store.hasCv()).toBe(true);
    });
  });

  describe('loadUserCVs', () => {
    it('sets loading true while the request is in flight', async () => {
      const store = await setup();
      cvApiServiceMock.getUserCvs.mockReturnValue(new Subject());

      store.loadUserCVs();

      expect(store.loading()).toBe(true);
    });

    it('populates the cv list on success', async () => {
      const store = await setup();

      store.loadUserCVs();

      expect(store.cvList()).toEqual(mockCvs);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('sets an error message on failure', async () => {
      const store = await setup();
      cvApiServiceMock.getUserCvs.mockReturnValue(
        throwError(() => ({ error: { message: 'Boom' } })),
      );

      store.loadUserCVs();

      expect(store.loading()).toBe(false);
      expect(store.error()).toBe('Boom');
    });

    it('falls back to a generic error message when none is provided', async () => {
      const store = await setup();
      cvApiServiceMock.getUserCvs.mockReturnValue(throwError(() => ({})));

      store.loadUserCVs();

      expect(store.error()).toBe('Failed to load files. Please try again.');
    });

    it('does not refetch when a cv list is already loaded and force is false', async () => {
      const store = await setup();
      store.loadUserCVs();
      cvApiServiceMock.getUserCvs.mockClear();

      store.loadUserCVs();

      expect(cvApiServiceMock.getUserCvs).not.toHaveBeenCalled();
    });

    it('does not refetch while a request is already loading', async () => {
      const store = await setup();
      cvApiServiceMock.getUserCvs.mockReturnValue(new Subject());
      store.loadUserCVs();
      cvApiServiceMock.getUserCvs.mockClear();

      store.loadUserCVs();

      expect(cvApiServiceMock.getUserCvs).not.toHaveBeenCalled();
    });

    it('refetches when force is true even if data already exists', async () => {
      const store = await setup();
      store.loadUserCVs();
      cvApiServiceMock.getUserCvs.mockClear();

      store.loadUserCVs(true);

      expect(cvApiServiceMock.getUserCvs).toHaveBeenCalledOnce();
    });
  });

  describe('resetStore', () => {
    it('resets the state back to initial values', async () => {
      const store = await setup();
      store.loadUserCVs();
      expect(store.cvList()).toEqual(mockCvs);

      store.resetStore();

      expect(store.cvList()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.hasCv()).toBe(false);
    });
  });
});
