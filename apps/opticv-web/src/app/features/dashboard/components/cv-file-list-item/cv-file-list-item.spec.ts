import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileListItem } from './cv-file-list-item';

const mockFile: CvDocumentListItem = {
  id: 'doc-id',
  fileName: 'my-cv.pdf',
  fileSize: 1536,
  mimeType: 'application/pdf',
  createdAt: '2024-06-15T00:00:00.000Z',
  parsedText: null,
  parseStatus: 'COMPLETED',
};

describe('CvFileListItem', () => {
  let fixture: ComponentFixture<CvFileListItem>;
  let component: CvFileListItem;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CvFileListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(CvFileListItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('file', mockFile);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the file name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain(mockFile.fileName);
  });

  it('should display formatted file size', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('1.5 KB');
  });

  it('should display MIME label', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('PDF');
  });

  it('should emit download output when onDownload is called', () => {
    let emitted: CvDocumentListItem | undefined;
    component.download.subscribe((f) => (emitted = f));

    component.onDownload();

    expect(emitted).toEqual(mockFile);
  });

  it('should emit delete output when onDelete is called', () => {
    let emitted: CvDocumentListItem | undefined;
    component.delete.subscribe((f) => (emitted = f));

    component.onDelete();

    expect(emitted).toEqual(mockFile);
  });

  it('should emit optimize output when onOptimize is called', () => {
    let emitted: CvDocumentListItem | undefined;
    component.optimize.subscribe((f) => (emitted = f));

    component.onOptimize();

    expect(emitted).toEqual(mockFile);
  });

  it('should emit optimize when the optimize button is clicked', () => {
    let emitted: CvDocumentListItem | undefined;
    component.optimize.subscribe((f) => (emitted = f));

    const buttons = fixture.debugElement.queryAll(By.css('p-button'));
    const optimizeButton = buttons[0];
    optimizeButton.triggerEventHandler('onClick', null);

    expect(emitted).toEqual(mockFile);
  });

  it('should emit download when the download button is clicked', () => {
    let emitted: CvDocumentListItem | undefined;
    component.download.subscribe((f) => (emitted = f));

    const buttons = fixture.debugElement.queryAll(By.css('p-button'));
    const downloadButton = buttons[1];
    downloadButton.triggerEventHandler('onClick', null);

    expect(emitted).toEqual(mockFile);
  });

  it('should emit delete when the delete button is clicked', () => {
    let emitted: CvDocumentListItem | undefined;
    component.delete.subscribe((f) => (emitted = f));

    const buttons = fixture.debugElement.queryAll(By.css('p-button'));
    const deleteButton = buttons[2];
    deleteButton.triggerEventHandler('onClick', null);

    expect(emitted).toEqual(mockFile);
  });

  it('should NOT show "Parsed" status for COMPLETED', () => {
    fixture.componentRef.setInput('file', { ...mockFile, parseStatus: 'COMPLETED' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Parsed');
  });

  it('should show "Parsing…" status for PENDING', () => {
    fixture.componentRef.setInput('file', { ...mockFile, parseStatus: 'PENDING' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Parsing');
  });

  it('should show "Parsing failed" status for FAILED', () => {
    fixture.componentRef.setInput('file', { ...mockFile, parseStatus: 'FAILED' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Parsing failed');
  });
});
