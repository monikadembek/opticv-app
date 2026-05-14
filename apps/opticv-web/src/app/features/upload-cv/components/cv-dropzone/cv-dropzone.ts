import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  PLATFORM_ID,
  inject,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { formatFileSize } from '../../../../shared/utils';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-cv-dropzone',
  imports: [ButtonModule],
  templateUrl: './cv-dropzone.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class CvDropzone {
  private readonly platformId = inject(PLATFORM_ID);

  readonly isLoading = input<boolean>(false);
  readonly fileSelected = output<File>();

  readonly selectedFile = signal<File | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly isDragOver = signal(false);

  readonly filesize = computed<string>(() => {
    if (this.selectedFile()) {
      return formatFileSize((this.selectedFile() as File).size);
    }
    return '';
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    if (!isPlatformBrowser(this.platformId)) return;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      this.validationError.set('Only one file can be uploaded at a time.');
      return;
    }

    this.validateFile(files[0]);
  }

  onFileInputChange(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.validateFile(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.validationError.set(null);
  }

  submit(): void {
    const file = this.selectedFile();
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  private validateFile(file: File): void {
    this.validationError.set(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.validationError.set('Only PDF and DOCX files are accepted.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.validationError.set('File must be smaller than 5 MB.');
      return;
    }

    this.selectedFile.set(file);
  }
}
