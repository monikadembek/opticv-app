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
import { CloudUpload } from '@primeicons/angular/cloud-upload';

export interface UploadFileError {
  type: 'too_many_files' | 'unsupported_format' | 'too_big_size';
  file: File;
  message: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-cv-dropzone',
  imports: [ButtonModule, CloudUpload],
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
  readonly validationError = output<UploadFileError | null>();

  readonly selectedFile = signal<File | null>(null);
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
      this.validationError.emit({
        type: 'too_many_files',
        file: files[0],
        message: 'Only one file can be uploaded at a time.',
      });
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
    this.validationError.emit(null);
  }

  submit(): void {
    const file = this.selectedFile();
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  private validateFile(file: File): void {
    this.validationError.emit(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      this.validationError.emit({
        type: 'unsupported_format',
        file: file,
        message: 'Only PDF and DOCX files are accepted.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.validationError.emit({
        type: 'too_big_size',
        file: file,
        message: 'File must be smaller than 5 MB.',
      });
      return;
    }

    this.selectedFile.set(file);
  }
}
