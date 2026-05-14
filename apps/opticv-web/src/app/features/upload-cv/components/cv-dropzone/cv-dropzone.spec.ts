import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { CvDropzone } from './cv-dropzone';

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File([new ArrayBuffer(size)], name, { type });
  return file;
}

function makeDragEvent(files: File[]): DragEvent {
  return {
    preventDefault: () => undefined,
    dataTransfer: { files },
  } as unknown as DragEvent;
}

describe('CvDropzone', () => {
  let fixture: ComponentFixture<CvDropzone>;
  let component: CvDropzone;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvDropzone],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    fixture = TestBed.createComponent(CvDropzone);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validateFile', () => {
    it('should accept a valid PDF file', () => {
      const file = makeFile('resume.pdf', PDF_TYPE);
      const fileInputEvent = { target: { files: [file] } } as unknown as Event;

      component.onFileInputChange(fileInputEvent);

      expect(component.selectedFile()).toBe(file);
      expect(component.validationError()).toBeNull();
    });

    it('should accept a valid DOCX file', () => {
      const file = makeFile('resume.docx', DOCX_TYPE);
      const fileInputEvent = { target: { files: [file] } } as unknown as Event;

      component.onFileInputChange(fileInputEvent);

      expect(component.selectedFile()).toBe(file);
      expect(component.validationError()).toBeNull();
    });

    it('should reject a file with unsupported mime type', () => {
      const file = makeFile('resume.txt', 'text/plain');
      const fileInputEvent = { target: { files: [file] } } as unknown as Event;

      component.onFileInputChange(fileInputEvent);

      expect(component.selectedFile()).toBeNull();
      expect(component.validationError()).toBe(
        'Only PDF and DOCX files are accepted.',
      );
    });

    it('should reject a file exceeding 5 MB', () => {
      const file = makeFile('resume.pdf', PDF_TYPE, 6 * 1024 * 1024);
      const fileInputEvent = { target: { files: [file] } } as unknown as Event;

      component.onFileInputChange(fileInputEvent);

      expect(component.selectedFile()).toBeNull();
      expect(component.validationError()).toBe('File must be smaller than 5 MB.');
    });

    it('should clear validation error when a valid file follows an invalid one', () => {
      const invalid = makeFile('resume.txt', 'text/plain');
      component.onFileInputChange({
        target: { files: [invalid] },
      } as unknown as Event);
      expect(component.validationError()).not.toBeNull();

      const valid = makeFile('resume.pdf', PDF_TYPE);
      component.onFileInputChange({
        target: { files: [valid] },
      } as unknown as Event);
      expect(component.validationError()).toBeNull();
      expect(component.selectedFile()).toBe(valid);
    });
  });

  describe('onDrop', () => {
    it('should accept a valid dropped file', () => {
      const file = makeFile('resume.pdf', PDF_TYPE);

      component.onDrop(makeDragEvent([file]));

      expect(component.selectedFile()).toBe(file);
      expect(component.isDragOver()).toBe(false);
    });

    it('should set validation error when more than one file is dropped', () => {
      const file1 = makeFile('a.pdf', PDF_TYPE);
      const file2 = makeFile('b.pdf', PDF_TYPE);

      component.onDrop(makeDragEvent([file1, file2]));

      expect(component.selectedFile()).toBeNull();
      expect(component.validationError()).toBe(
        'Only one file can be uploaded at a time.',
      );
    });

    it('should do nothing when dataTransfer has no files', () => {
      component.onDrop(makeDragEvent([]));

      expect(component.selectedFile()).toBeNull();
      expect(component.validationError()).toBeNull();
    });
  });

  describe('onDragOver / onDragLeave', () => {
    it('should set isDragOver to true on dragover', () => {
      component.onDragOver(makeDragEvent([]));
      expect(component.isDragOver()).toBe(true);
    });

    it('should set isDragOver to false on dragleave', () => {
      component.onDragOver(makeDragEvent([]));
      component.onDragLeave(makeDragEvent([]));
      expect(component.isDragOver()).toBe(false);
    });
  });

  describe('removeFile', () => {
    it('should clear selected file and validation error', () => {
      const file = makeFile('resume.pdf', PDF_TYPE);
      component.onFileInputChange({
        target: { files: [file] },
      } as unknown as Event);

      component.removeFile();

      expect(component.selectedFile()).toBeNull();
      expect(component.validationError()).toBeNull();
    });
  });

  describe('submit', () => {
    it('should emit fileSelected with the selected file', () => {
      const file = makeFile('resume.pdf', PDF_TYPE);
      component.onFileInputChange({
        target: { files: [file] },
      } as unknown as Event);

      let emitted: File | undefined;
      component.fileSelected.subscribe((f: File) => (emitted = f));

      component.submit();

      expect(emitted).toBe(file);
    });

    it('should not emit when no file is selected', () => {
      let emitted = false;
      component.fileSelected.subscribe(() => (emitted = true));

      component.submit();

      expect(emitted).toBe(false);
    });
  });

  describe('filesize computed', () => {
    it('should return formatted file size when a file is selected', () => {
      const file = makeFile('resume.pdf', PDF_TYPE, 1024);
      component.onFileInputChange({
        target: { files: [file] },
      } as unknown as Event);

      expect(component.filesize()).toBe('1.0 KB');
    });

    it('should return empty string when no file is selected', () => {
      expect(component.filesize()).toBe('');
    });
  });

  describe('template', () => {
    it('should show the file name and remove button when a file is selected', () => {
      const file = makeFile('resume.pdf', PDF_TYPE, 2048);
      component.onFileInputChange({
        target: { files: [file] },
      } as unknown as Event);
      fixture.detectChanges();

      const fileName = fixture.debugElement.query(By.css('.truncate'));
      expect(fileName.nativeElement.textContent.trim()).toBe('resume.pdf');

      const removeBtn = fixture.debugElement.query(
        By.css('[aria-label="Remove file"]'),
      );
      expect(removeBtn).toBeTruthy();
    });

    it('should show validation error in the template', () => {
      const file = makeFile('resume.txt', 'text/plain');
      component.onFileInputChange({
        target: { files: [file] },
      } as unknown as Event);
      fixture.detectChanges();

      const alert = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(alert.nativeElement.textContent.trim()).toBe(
        'Only PDF and DOCX files are accepted.',
      );
    });

    it('should not show validation error when there is none', () => {
      fixture.detectChanges();
      const alert = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(alert).toBeNull();
    });
  });
});
