import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { CvDocumentListItem, JobApplicationListItem } from '@opticv/datatypes';
import { Dashboard } from './dashboard';
import { CvApiService } from '../../core/services/cv-api.service';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';
import { CvStore } from '../../core/stores/cv.store';
import { Supabase } from '../../core/auth/services/supabase';

const mockCvFiles: CvDocumentListItem[] = [
  {
    id: 'id-1',
    fileName: 'cv1.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    createdAt: '2024-01-01T00:00:00.000Z',
    parsedText: null,
    parseStatus: 'COMPLETED',
  },
];

const mockOptimizations: JobApplicationListItem[] = [
  {
    id: 'app-id-1',
    userId: 'user-1',
    cvDocumentId: 'cv-id-1',
    jobTitle: 'Frontend Developer',
    companyName: 'Acme Corp',
    atsScore: 85,
    createdAt: '2024-01-05T00:00:00.000Z',
    updatedAt: '2024-01-06T00:00:00.000Z',
    cvDocument: { id: 'cv-id-1', fileName: 'cv.pdf' },
  },
];

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let cvApiService: {
    getUserCvs: ReturnType<typeof vi.fn>;
    downloadCv: ReturnType<typeof vi.fn>;
    deleteCv: ReturnType<typeof vi.fn>;
  };
  let jobApplicationApiService: {
    getJobApplications: ReturnType<typeof vi.fn>;
    deleteJobApplication: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.resetTestingModule();

    cvApiService = {
      getUserCvs: vi.fn().mockReturnValue(of(mockCvFiles)),
      downloadCv: vi.fn().mockReturnValue(of({ url: 'https://signed.url' })),
      deleteCv: vi.fn().mockReturnValue(of(undefined)),
    };
    jobApplicationApiService = {
      getJobApplications: vi
        .fn()
        .mockReturnValue(of({ data: mockOptimizations, total: 1 })),
      deleteJobApplication: vi.fn().mockReturnValue(of(undefined)),
    };
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: CvApiService, useValue: cvApiService },
        { provide: JobApplicationApiService, useValue: jobApplicationApiService },
        { provide: MessageService, useValue: messageService },
        {
          provide: Supabase,
          useValue: { currentUser: vi.fn().mockReturnValue(null) },
        },
        ConfirmationService,
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the page heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent?.trim()).toBe('Dashboard');
  });

  it('should render the My CVs tab', () => {
    const tabs = fixture.nativeElement.querySelectorAll('p-tab');
    const labels = Array.from(tabs as NodeListOf<Element>).map((t) =>
      t.textContent?.trim(),
    );
    expect(labels).toContain('My CVs');
  });

  it('should render the My Optimizations tab', () => {
    const tabs = fixture.nativeElement.querySelectorAll('p-tab');
    const labels = Array.from(tabs as NodeListOf<Element>).map((t) =>
      t.textContent?.trim(),
    );
    expect(labels).toContain('My Optimizations');
  });

  it('should include the cv-file-list component', () => {
    const el = fixture.nativeElement.querySelector('app-cv-file-list');
    expect(el).toBeTruthy();
  });

  it('should include the optimization-list component', () => {
    const el = fixture.nativeElement.querySelector('app-optimization-list');
    expect(el).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads optimizations on init', () => {
      expect(jobApplicationApiService.getJobApplications).toHaveBeenCalled();
      expect(component.optimizationsItems()).toEqual(mockOptimizations);
      expect(component.isLoadingOptimizations()).toBe(false);
    });
  });

  describe('loadOptimizations', () => {
    it('sets optimizationsError on failure', () => {
      jobApplicationApiService.getJobApplications.mockReturnValue(
        throwError(() => ({ error: { message: 'Load error' } })),
      );
      component.loadOptimizations();
      expect(component.optimizationsError()).toBe('Load error');
      expect(component.isLoadingOptimizations()).toBe(false);
    });

    it('uses fallback error message when error has no message', () => {
      jobApplicationApiService.getJobApplications.mockReturnValue(
        throwError(() => ({})),
      );
      component.loadOptimizations();
      expect(component.optimizationsError()).toBe(
        'Failed to load optimizations. Please try again.',
      );
    });
  });

  describe('loadUserCvs', () => {
    it('forces a reload of the CV store', () => {
      const cvStore = TestBed.inject(CvStore);
      const loadSpy = vi.spyOn(cvStore, 'loadUserCVs');

      component.loadUserCvs();

      expect(loadSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('downloadCv', () => {
    it('calls downloadCv with the file id', () => {
      component.downloadCv(mockCvFiles[0]);
      expect(cvApiService.downloadCv).toHaveBeenCalledWith(mockCvFiles[0].id);
    });

    it('shows an error toast when download fails', () => {
      cvApiService.downloadCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Download failed' } })),
      );
      component.downloadCv(mockCvFiles[0]);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Download failed',
        }),
      );
    });

    it('uses fallback message when download error has no message', () => {
      cvApiService.downloadCv.mockReturnValue(throwError(() => ({})));
      component.downloadCv(mockCvFiles[0]);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Downloading CV failed. Please try again.',
        }),
      );
    });
  });

  describe('deleteCv', () => {
    it('removes the file from the CV store after successful deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.deleteCv(mockCvFiles[0]);

      expect(cvApiService.deleteCv).toHaveBeenCalledWith(mockCvFiles[0].id);
      expect(component.cvFiles()).not.toContain(mockCvFiles[0]);
    });

    it('shows a success toast after deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.deleteCv(mockCvFiles[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast when deletion fails', () => {
      cvApiService.deleteCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete error' } })),
      );
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.deleteCv(mockCvFiles[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Delete failed',
        }),
      );
    });

    it('does not call deleteCv when confirmation is rejected', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation(
        () => confirmationService,
      );

      component.deleteCv(mockCvFiles[0]);

      expect(cvApiService.deleteCv).not.toHaveBeenCalled();
    });
  });

  describe('onDeleteOptimizations', () => {
    it('removes the item from optimizationsItems after successful deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDeleteOptimizations(mockOptimizations[0]);

      expect(
        jobApplicationApiService.deleteJobApplication,
      ).toHaveBeenCalledWith(mockOptimizations[0].id);
      expect(component.optimizationsItems()).not.toContain(
        mockOptimizations[0],
      );
    });

    it('shows a success toast after deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDeleteOptimizations(mockOptimizations[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast when deletion fails', () => {
      jobApplicationApiService.deleteJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete error' } })),
      );
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDeleteOptimizations(mockOptimizations[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Delete failed',
        }),
      );
    });

    it('does not call deleteJobApplication when confirmation is rejected', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation(
        () => confirmationService,
      );

      component.onDeleteOptimizations(mockOptimizations[0]);

      expect(
        jobApplicationApiService.deleteJobApplication,
      ).not.toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('shows the number of stored CVs', () => {
      expect(fixture.nativeElement.textContent).toContain(
        `${mockCvFiles.length}`,
      );
    });

    it('shows the number of optimizations', () => {
      expect(fixture.nativeElement.textContent).toContain(
        `${mockOptimizations.length}`,
      );
    });

    it('shows the latest activity date when activity exists', () => {
      expect(component.lastActivityTime()).not.toBeNull();
    });
  });
});
