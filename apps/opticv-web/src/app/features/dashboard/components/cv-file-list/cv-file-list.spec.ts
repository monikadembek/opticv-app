import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileList } from './cv-file-list';

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

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [CvFileList],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CvFileList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cvFiles', mockFiles);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('renders one row per file', () => {
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(mockFiles.length);
    });

    it('renders no rows when the list is empty', () => {
      fixture.componentRef.setInput('cvFiles', []);
      fixture.detectChanges();
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(0);
    });

    it('shows an empty state message when the list is empty', () => {
      fixture.componentRef.setInput('cvFiles', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        "You haven't uploaded any CVs yet.",
      );
    });

    it('shows the error message and a retry button on error', () => {
      fixture.componentRef.setInput('cvsError', 'Load error');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Load error');
      const retryButton = fixture.nativeElement.querySelector(
        'p-button[label="Retry"]',
      );
      expect(retryButton).toBeTruthy();
    });
  });

  describe('loadUserCvs', () => {
    it('emits loadCvs when retry is triggered', () => {
      fixture.componentRef.setInput('cvsError', 'Load error');
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.loadCvs, 'emit');

      component.loadUserCvs();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('optimizeCv', () => {
    it('navigates to cv-optimization with the CV id as a query param', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      component.optimizeCv(mockFiles[0]);

      expect(navigateSpy).toHaveBeenCalledWith(['/cv-optimization'], {
        queryParams: { cvId: mockFiles[0].id },
      });
    });
  });

  describe('downloadCv', () => {
    it('emits downloadCvFile with the file', () => {
      const emitSpy = vi.spyOn(component.downloadCvFile, 'emit');

      component.downloadCv(mockFiles[0]);

      expect(emitSpy).toHaveBeenCalledWith(mockFiles[0]);
    });
  });

  describe('deleteCv', () => {
    it('emits deleteCvFile with the file', () => {
      const emitSpy = vi.spyOn(component.deleteCvFile, 'emit');

      component.deleteCv(mockFiles[0]);

      expect(emitSpy).toHaveBeenCalledWith(mockFiles[0]);
    });
  });
});
