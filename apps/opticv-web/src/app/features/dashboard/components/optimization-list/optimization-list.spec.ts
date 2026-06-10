import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import type { JobApplicationListItem } from '@opticv/datatypes';
import { OptimizationList } from './optimization-list';
import { JobApplicationApiService } from '../../../../core/services/job-application-api.service';

const mockItems: JobApplicationListItem[] = [
  {
    id: 'app-id-1',
    userId: 'user-1',
    cvDocumentId: 'cv-id-1',
    jobTitle: 'Frontend Developer',
    companyName: 'Acme Corp',
    atsScore: 85,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    cvDocument: { id: 'cv-id-1', fileName: 'cv.pdf' },
  },
  {
    id: 'app-id-2',
    userId: 'user-1',
    cvDocumentId: 'cv-id-2',
    jobTitle: 'Backend Engineer',
    companyName: 'Beta Inc',
    atsScore: null,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-02T00:00:00.000Z',
    cvDocument: { id: 'cv-id-2', fileName: 'resume.docx' },
  },
];

describe('OptimizationList', () => {
  let fixture: ComponentFixture<OptimizationList>;
  let component: OptimizationList;
  let jobApplicationApiService: {
    getJobApplications: ReturnType<typeof vi.fn>;
    deleteJobApplication: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    jobApplicationApiService = {
      getJobApplications: vi.fn().mockReturnValue(of({ data: mockItems, total: 2 })),
      deleteJobApplication: vi.fn().mockReturnValue(of(undefined)),
    };
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OptimizationList],
      providers: [
        { provide: JobApplicationApiService, useValue: jobApplicationApiService },
        { provide: MessageService, useValue: messageService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizationList);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadOptimizations', () => {
    it('populates items and clears isLoading on success', () => {
      expect(component.items()).toEqual(mockItems);
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('sets error on failure', () => {
      jobApplicationApiService.getJobApplications.mockReturnValue(
        throwError(() => ({ error: { message: 'Load error' } })),
      );
      component.loadOptimizations();
      expect(component.error()).toBe('Load error');
      expect(component.isLoading()).toBe(false);
    });

    it('uses fallback error message when error has no message', () => {
      jobApplicationApiService.getJobApplications.mockReturnValue(
        throwError(() => ({})),
      );
      component.loadOptimizations();
      expect(component.error()).toBe('Failed to load optimizations. Please try again.');
    });

    it('renders one row per item', () => {
      const rows = fixture.debugElement.queryAll(By.css('.border.border-surface-200'));
      expect(rows.length).toBe(mockItems.length);
    });

    it('renders no rows when the list is empty', () => {
      jobApplicationApiService.getJobApplications.mockReturnValue(
        of({ data: [], total: 0 }),
      );
      component.loadOptimizations();
      fixture.detectChanges();
      const rows = fixture.debugElement.queryAll(By.css('.border.border-surface-200'));
      expect(rows.length).toBe(0);
    });
  });

  describe('onOpen', () => {
    it('navigates to /cv-optimization/:id', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.onOpen(mockItems[0]);
      expect(navigateSpy).toHaveBeenCalledWith(['/cv-optimization', mockItems[0].id]);
    });
  });

  describe('onDelete', () => {
    it('removes the item from items after successful deletion', () => {
      const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockItems[0]);

      expect(jobApplicationApiService.deleteJobApplication).toHaveBeenCalledWith(
        mockItems[0].id,
      );
      expect(component.items()).not.toContain(mockItems[0]);
    });

    it('shows a success toast after deletion', () => {
      const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockItems[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast when deletion fails', () => {
      jobApplicationApiService.deleteJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete error' } })),
      );
      const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockItems[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Delete failed' }),
      );
    });

    it('uses fallback message when deletion error has no message', () => {
      jobApplicationApiService.deleteJobApplication.mockReturnValue(
        throwError(() => ({})),
      );
      const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockItems[0]);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Failed to delete optimization. Please try again.',
        }),
      );
    });

    it('does not call deleteJobApplication when confirmation is rejected', () => {
      const confirmationService = fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation(
        () => confirmationService,
      );

      component.onDelete(mockItems[0]);

      expect(jobApplicationApiService.deleteJobApplication).not.toHaveBeenCalled();
    });
  });
});
