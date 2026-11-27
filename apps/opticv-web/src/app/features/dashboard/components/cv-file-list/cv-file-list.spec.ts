import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileList } from './cv-file-list';

const mockFiles: CvDocumentListItem[] = [
  {
    id: 'id-1',
    name: 'cv1',
    fileName: 'cv1.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    storageKey: 'uploads/user-id/uuid1.pdf',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-10T12:00:00.000Z',
    parsedText: null,
    parseStatus: 'COMPLETED',
    extractionStatus: 'COMPLETED',
    manuallyEdited: false,
  },
  {
    id: 'id-2',
    name: 'cv2',
    fileName: 'cv2.docx',
    fileSize: 2048,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storageKey: 'uploads/user-id/uuid2.docx',
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
    parsedText: null,
    parseStatus: 'PENDING',
    extractionStatus: 'PENDING',
    manuallyEdited: false,
  },
  {
    id: 'id-3',
    name: 'Built CV',
    fileName: null,
    fileSize: null,
    mimeType: null,
    storageKey: null,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-15T12:00:00.000Z',
    parsedText: null,
    parseStatus: 'COMPLETED',
    extractionStatus: 'COMPLETED',
    manuallyEdited: true,
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

  describe('table', () => {
    const rows = () =>
      fixture.debugElement
        .queryAll(By.css('tbody tr'))
        .map((r) => r.nativeElement as HTMLElement);
    const cells = (row: HTMLElement) =>
      Array.from(row.querySelectorAll('td')) as HTMLElement[];

    it('renders the Name / Source / Updated / Actions headers', () => {
      const headers = Array.from(
        fixture.nativeElement.querySelectorAll(
          'thead th',
        ) as NodeListOf<Element>,
      ).map((th) => th.textContent?.trim());
      expect(headers).toEqual(['Name', 'Source', 'Updated', 'Actions']);
    });

    it('shows the CV name in each row', () => {
      expect(cells(rows()[0])[0].textContent).toContain('cv1');
      expect(cells(rows()[0])[0].textContent).not.toContain('cv1.pdf');
      expect(cells(rows()[2])[0].textContent).toContain('Built CV');
    });

    it('shows the source label for each row', () => {
      const labels = rows().map((r) => cells(r)[1].textContent?.trim());
      expect(labels).toEqual(['PDF', 'DOCX', 'Built in app']);
    });

    it('adds a file-size title to uploaded CVs only', () => {
      const pill = (r: HTMLElement) => cells(r)[1].querySelector('span');
      expect(pill(rows()[0])?.getAttribute('title')).toBe('1.0 KB');
      expect(pill(rows()[1])?.getAttribute('title')).toBe('2.0 KB');
      expect(pill(rows()[2])?.hasAttribute('title')).toBe(false);
    });

    it('shows the icon for each source', () => {
      const icon = (r: HTMLElement) => cells(r)[0].querySelector('i.pi');
      expect(icon(rows()[0])?.classList).toContain('pi-file-pdf');
      expect(icon(rows()[1])?.classList).toContain('pi-file-word');
      expect(icon(rows()[2])?.classList).toContain('pi-file-edit');
      expect(icon(rows()[2])?.getAttribute('aria-hidden')).toBe('true');
    });

    it('shows the formatted updated date', () => {
      expect(cells(rows()[0])[2].textContent?.trim()).toBe('Jan 10, 2024');
      expect(cells(rows()[2])[2].textContent?.trim()).toBe('Mar 15, 2024');
    });

    it('filters rows by name when searching', async () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'input[placeholder="Search"]',
      );
      input.value = 'built';
      input.dispatchEvent(new Event('input'));
      await new Promise((resolve) => setTimeout(resolve, 400));
      fixture.detectChanges();

      expect(rows().length).toBe(1);
      expect(rows()[0].textContent).toContain('Built CV');
    });
  });

  describe('Rename button', () => {
    const renameButtons = () =>
      fixture.debugElement.queryAll(
        By.css('p-button[icon="pi pi-pen-to-square"]'),
      );

    it('is rendered and enabled for every row', () => {
      expect(renameButtons().length).toBe(mockFiles.length);
      expect(renameButtons().every((b) => !b.componentInstance.disabled)).toBe(
        true,
      );
    });

    it('emits renameCvFile with the file when clicked, even while extraction is pending', () => {
      const emitSpy = vi.spyOn(component.renameCvFile, 'emit');

      renameButtons()[1].triggerEventHandler(
        'onClick',
        new MouseEvent('click'),
      );

      expect(emitSpy).toHaveBeenCalledWith(mockFiles[1]);
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

  describe('editCv', () => {
    it('navigates to cv-builder/:id', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      component.editCv(mockFiles[0]);

      expect(navigateSpy).toHaveBeenCalledWith([
        '/cv-builder',
        mockFiles[0].id,
      ]);
    });
  });

  describe('Edit button state', () => {
    it('is enabled when extractionStatus is COMPLETED', () => {
      const buttons = fixture.debugElement.queryAll(
        By.css('p-button[icon="pi pi-pencil"]'),
      );
      expect(buttons[0].componentInstance.disabled).toBeFalsy();
    });

    it('is disabled when extractionStatus is not COMPLETED', () => {
      const buttons = fixture.debugElement.queryAll(
        By.css('p-button[icon="pi pi-pencil"]'),
      );
      expect(buttons[1].componentInstance.disabled).toBeTruthy();
    });
  });

  describe('Download button visibility', () => {
    it('is shown when storageKey is present', () => {
      const downloadButtons = fixture.debugElement.queryAll(
        By.css('p-button[icon="pi pi-download"]'),
      );
      expect(downloadButtons.length).toBe(2);
    });

    it('is hidden when storageKey is null (builder-created CV)', () => {
      fixture.componentRef.setInput('cvFiles', [
        { ...mockFiles[0], storageKey: null },
      ]);
      fixture.detectChanges();

      const downloadButtons = fixture.debugElement.queryAll(
        By.css('p-button[icon="pi pi-download"]'),
      );
      expect(downloadButtons.length).toBe(0);
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
