import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    }).compileComponents();

    fixture = TestBed.createComponent(CvFileList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('files', mockFiles);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one list item per file', () => {
    const items = fixture.debugElement.queryAll(
      By.css('app-cv-file-list-item'),
    );
    expect(items.length).toBe(mockFiles.length);
  });

  it('should render no items when files is empty', () => {
    fixture.componentRef.setInput('files', []);
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(
      By.css('app-cv-file-list-item'),
    );
    expect(items.length).toBe(0);
  });

  it('should emit download event when a child emits download', () => {
    let emitted: CvDocumentListItem | undefined;
    component.download.subscribe((f) => (emitted = f));

    const item = fixture.debugElement.query(By.css('app-cv-file-list-item'));
    item.triggerEventHandler('download', mockFiles[0]);

    expect(emitted).toEqual(mockFiles[0]);
  });

  it('should emit delete event when a child emits delete', () => {
    let emitted: CvDocumentListItem | undefined;
    component.delete.subscribe((f) => (emitted = f));

    const item = fixture.debugElement.query(By.css('app-cv-file-list-item'));
    item.triggerEventHandler('delete', mockFiles[0]);

    expect(emitted).toEqual(mockFiles[0]);
  });
});
