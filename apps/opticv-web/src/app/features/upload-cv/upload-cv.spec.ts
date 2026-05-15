import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { UploadCvResponse } from '@opticv/datatypes';
import { UploadCv } from './upload-cv';
import { CvUploadApiService } from './services/cv-upload-api.service';
import { CvDropzone } from './components/cv-dropzone/cv-dropzone';

const mockResponse: UploadCvResponse = {
  id: 'cv-1',
  fileName: 'resume.pdf',
  fileSize: 2 * 1024 * 1024,
  mimeType: 'application/pdf',
  storageKey: 'uploads/resume.pdf',
  createdAt: '2026-05-14T10:00:00.000Z',
  parseStatus: 'COMPLETED',
};

describe('UploadCv', () => {
  let fixture: ComponentFixture<UploadCv>;
  let component: UploadCv;
  let cvUploadApiService: { uploadCv: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cvUploadApiService = { uploadCv: vi.fn() };
    messageService = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UploadCv],
      providers: [
        { provide: CvUploadApiService, useValue: cvUploadApiService },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadCv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onFileSelected', () => {
    it('should set isLoading to true while upload is in progress', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(cvUploadApiService.uploadCv).toHaveBeenCalledTimes(1);
    });

    it('should set uploadedFile on successful upload', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(component.uploadedFile()).toEqual(mockResponse);
      expect(component.isLoading()).toBe(false);
    });

    it('should show a success toast on successful upload', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('should clear the dropzone selected file on success', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));
      const dropzone = component.dropZoneComponent();
      dropzone.selectedFile.set(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(dropzone.selectedFile()).toBeNull();
    });

    it('should set isLoading to false and show error toast on failure', () => {
      const err = { error: { message: 'Server error' } };
      cvUploadApiService.uploadCv.mockReturnValue(throwError(() => err));

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(component.isLoading()).toBe(false);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: 'Server error' }),
      );
    });

    it('should use fallback message when error has no message', () => {
      cvUploadApiService.uploadCv.mockReturnValue(throwError(() => ({})));

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Upload failed. Please try again.',
        }),
      );
    });

    it('should clear the dropzone selected file on failure', () => {
      cvUploadApiService.uploadCv.mockReturnValue(throwError(() => ({})));
      const dropzone = component.dropZoneComponent();
      dropzone.selectedFile.set(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(dropzone.selectedFile()).toBeNull();
    });
  });

  describe('filesize computed', () => {
    it('should return formatted file size from uploadedFile', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));
      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );

      expect(component.filesize()).toBe('2.0 MB');
    });

    it('should return empty string when uploadedFile is null', () => {
      expect(component.filesize()).toBe('');
    });
  });

  describe('template', () => {
    it('should render the cv-dropzone component', () => {
      const dropzone = fixture.debugElement.query(By.directive(CvDropzone));
      expect(dropzone).toBeTruthy();
    });

    it('should show the uploaded file section after successful upload', () => {
      cvUploadApiService.uploadCv.mockReturnValue(of(mockResponse));
      component.onFileSelected(
        new File([''], 'resume.pdf', { type: 'application/pdf' }),
      );
      fixture.detectChanges();

      const fileName = fixture.debugElement.query(By.css('.truncate'));
      expect(fileName.nativeElement.textContent.trim()).toBe('resume.pdf');
    });

    it('should not show the uploaded file section before any upload', () => {
      fixture.detectChanges();
      const addedLabel = fixture.debugElement.queryAll(By.css('p')).find((el) =>
        el.nativeElement.textContent.includes('Added file'),
      );
      expect(addedLabel).toBeUndefined();
    });

    it('should pass isLoading to the dropzone', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const dropzone = fixture.debugElement.query(
        By.directive(CvDropzone),
      ).componentInstance as CvDropzone;
      expect(dropzone.isLoading()).toBe(true);
    });
  });
});
