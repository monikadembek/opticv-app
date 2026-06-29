import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import type { UploadCvResponse } from '@opticv/datatypes';
import { CvDropzone } from './components/cv-dropzone/cv-dropzone';
import { CvUploadApiService } from './services/cv-upload-api.service';
import { formatFileSize } from '../../shared/utils';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-upload-cv',
  imports: [CvDropzone, ButtonModule, DatePipe, RouterLink],
  templateUrl: './upload-cv.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadCv {
  private readonly cvUploadApiService = inject(CvUploadApiService);
  private readonly messageService = inject(MessageService);

  readonly dropZoneComponent = viewChild.required<CvDropzone>(CvDropzone);

  readonly isLoading = signal(false);
  readonly uploadedFile = signal<UploadCvResponse | null>(null);

  readonly filesize = computed<string>(() => {
    if (this.uploadedFile()) {
      return formatFileSize((this.uploadedFile() as UploadCvResponse).fileSize);
    }
    return '';
  });

  onFileSelected(file: File): void {
    this.isLoading.set(true);
    this.cvUploadApiService.uploadCv(file).subscribe({
      next: (response) => {
        this.uploadedFile.set(response);
        this.isLoading.set(false);
        this.dropZoneComponent().selectedFile.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'CV file uploaded successfully.',
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.dropZoneComponent().selectedFile.set(null);
        const message =
          err?.error?.message ?? 'Upload failed. Please try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Upload failed',
          detail: message,
        });
      },
    });
  }
}
