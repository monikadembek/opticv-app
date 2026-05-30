import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { Dashboard } from './dashboard';
import { CvApiService } from './services/cv-api.service';

const mockFile: CvDocumentListItem = {
  id: 'doc-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  createdAt: '2024-01-01T00:00:00.000Z',
  parsedText: null,
  parseStatus: 'COMPLETED',
};

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let cvApiService: {
    getUserCvs: ReturnType<typeof vi.fn>;
    downloadCv: ReturnType<typeof vi.fn>;
    deleteCv: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    cvApiService = {
      getUserCvs: vi.fn().mockReturnValue(of([mockFile])),
      downloadCv: vi.fn().mockReturnValue(of({ url: 'https://signed.url' })),
      deleteCv: vi.fn().mockReturnValue(of(undefined)),
    };
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: CvApiService, useValue: cvApiService },
        { provide: MessageService, useValue: messageService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('loadFiles', () => {
    it('should populate cvFiles and clear isLoading on success', () => {
      cvApiService.getUserCvs.mockReturnValue(of([mockFile]));
      component.loadFiles();
      expect(component.cvFiles()).toEqual([mockFile]);
      expect(component.isLoading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should set error message on failure with server message', () => {
      cvApiService.getUserCvs.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } })),
      );
      component.loadFiles();
      expect(component.error()).toBe('Server error');
      expect(component.isLoading()).toBe(false);
    });

    it('should use fallback message when error has no message', () => {
      cvApiService.getUserCvs.mockReturnValue(throwError(() => ({})));
      component.loadFiles();
      expect(component.error()).toBe('Failed to load files. Please try again.');
    });

    it('should show empty list when no files returned', () => {
      cvApiService.getUserCvs.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(component.cvFiles()).toEqual([]);
    });

    it('should call loadFiles on init', () => {
      vi.spyOn(component, 'loadFiles');
      fixture.detectChanges();
      expect(component.loadFiles).toHaveBeenCalled();
    });
  });

  describe('onDownload', () => {
    it('should call downloadCv with the file id', () => {
      fixture.detectChanges();
      component.onDownload(mockFile);
      expect(cvApiService.downloadCv).toHaveBeenCalledWith(mockFile.id);
    });

    it('should add an error message when download fails', () => {
      fixture.detectChanges();
      cvApiService.downloadCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Download error' } })),
      );
      component.onDownload(mockFile);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Download failed' }),
      );
    });

    it('should use fallback message when download error has no message', () => {
      fixture.detectChanges();
      cvApiService.downloadCv.mockReturnValue(throwError(() => ({})));
      component.onDownload(mockFile);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Downloading CV failed. Please try again.',
        }),
      );
    });
  });

  describe('onDelete', () => {
    it('should remove the file from cvFiles after successful deletion', () => {
      fixture.detectChanges();
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockFile);

      expect(cvApiService.deleteCv).toHaveBeenCalledWith(mockFile.id);
      expect(component.cvFiles()).toEqual([]);
    });

    it('should add a success message after deletion', () => {
      fixture.detectChanges();
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockFile);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('should add an error message when deletion fails', () => {
      fixture.detectChanges();
      cvApiService.deleteCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete error' } })),
      );
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.onDelete(mockFile);

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Delete failed' }),
      );
    });

    it('should not call deleteCv when confirmation is rejected', () => {
      fixture.detectChanges();
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation(
        () => confirmationService,
      );

      component.onDelete(mockFile);

      expect(cvApiService.deleteCv).not.toHaveBeenCalled();
    });
  });
});
