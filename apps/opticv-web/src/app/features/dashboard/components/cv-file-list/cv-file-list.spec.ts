import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileList } from './cv-file-list';
import { CvApiService } from '../../../../core/services/cv-api.service';

const mockFiles: CvDocumentListItem[] = [
  {
    id: 'id-1',
    fileName: 'cv1.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    createdAt: '2024-01-01T00:00:00.000Z',
    parsedText: null,
    parseStatus: 'COMPLETED',
  },
  {
    id: 'id-2',
    fileName: 'cv2.docx',
    fileSize: 2048,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    createdAt: '2024-02-01T00:00:00.000Z',
    parsedText: null,
    parseStatus: 'PENDING',
  },
];

describe('CvFileList', () => {
  let fixture: ComponentFixture<CvFileList>;
  let component: CvFileList;
  let cvApiService: {
    getUserCvs: ReturnType<typeof vi.fn>;
    downloadCv: ReturnType<typeof vi.fn>;
    deleteCv: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    cvApiService = {
      getUserCvs: vi.fn().mockReturnValue(of(mockFiles)),
      downloadCv: vi.fn().mockReturnValue(of({ url: 'https://signed.url' })),
      deleteCv: vi.fn().mockReturnValue(of(undefined)),
    };
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CvFileList],
      providers: [
        { provide: CvApiService, useValue: cvApiService },
        { provide: MessageService, useValue: messageService },
        ConfirmationService,
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvFileList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadFiles', () => {
    it('populates cvFiles and clears isCvsLoading on success', () => {
      expect(component.cvFiles()).toEqual(mockFiles);
      expect(component.isCvsLoading()).toBe(false);
      expect(component.cvsError()).toBeNull();
    });

    it('renders one list item per file', () => {
      const items = fixture.debugElement.queryAll(
        By.css('app-cv-file-list-item'),
      );
      expect(items.length).toBe(mockFiles.length);
    });

    it('renders no items when the list is empty', () => {
      cvApiService.getUserCvs.mockReturnValue(of([]));
      component.cvStore.loadUserCVs(true);
      fixture.detectChanges();
      const items = fixture.debugElement.queryAll(
        By.css('app-cv-file-list-item'),
      );
      expect(items.length).toBe(0);
    });

    it('sets cvsError on failure', () => {
      cvApiService.getUserCvs.mockReturnValue(
        throwError(() => ({ error: { message: 'Load error' } })),
      );
      component.cvStore.loadUserCVs(true);
      expect(component.cvsError()).toBe('Load error');
      expect(component.isCvsLoading()).toBe(false);
    });

    it('uses fallback error message when error has no message', () => {
      cvApiService.getUserCvs.mockReturnValue(throwError(() => ({})));
      component.cvStore.loadUserCVs(true);
      expect(component.cvsError()).toBe(
        'Failed to load files. Please try again.',
      );
    });
  });

  describe('downloadCv', () => {
    it('calls downloadCv with the file id', () => {
      component.downloadCv(mockFiles[0]);
      expect(cvApiService.downloadCv).toHaveBeenCalledWith(mockFiles[0].id);
    });

    it('shows an error toast when download fails', () => {
      cvApiService.downloadCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Download failed' } })),
      );
      component.downloadCv(mockFiles[0]);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Download failed',
        }),
      );
    });

    it('uses fallback message when download error has no message', () => {
      cvApiService.downloadCv.mockReturnValue(throwError(() => ({})));
      component.downloadCv(mockFiles[0]);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Downloading CV failed. Please try again.',
        }),
      );
    });
  });

  describe('deleteCv', () => {
    it('removes the file from cvFiles after successful deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.deleteCv(mockFiles[0]);

      expect(cvApiService.deleteCv).toHaveBeenCalledWith(mockFiles[0].id);
      expect(component.cvFiles()).not.toContain(mockFiles[0]);
    });

    it('shows a success toast after deletion', () => {
      const confirmationService =
        fixture.debugElement.injector.get(ConfirmationService);
      vi.spyOn(confirmationService, 'confirm').mockImplementation((opts) => {
        opts.accept?.();
        return confirmationService;
      });

      component.deleteCv(mockFiles[0]);

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

      component.deleteCv(mockFiles[0]);

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

      component.deleteCv(mockFiles[0]);

      expect(cvApiService.deleteCv).not.toHaveBeenCalled();
    });
  });
});
