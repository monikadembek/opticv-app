import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvApiService } from './services/cv-api.service';
import { CvFileList } from './components/cv-file-list/cv-file-list';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    CvFileList,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class Dashboard implements OnInit {
  private readonly cvApiService = inject(CvApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly messageService = inject(MessageService);

  readonly cvFiles = signal<CvDocumentListItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedFile = signal<CvDocumentListItem | null>(null);

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.cvApiService.getUserCvs().subscribe({
      next: (files) => {
        this.cvFiles.set(files);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(
          err?.error?.message ?? 'Failed to load files. Please try again.',
        );
        this.isLoading.set(false);
      },
    });
  }

  onDownload(file: CvDocumentListItem): void {
    this.cvApiService.downloadCv(file.id).subscribe({
      next: ({ url }) => {
        if (isPlatformBrowser(this.platformId)) {
          window.open(url, '_blank');
        }
      },
      error: (err) => {
        const message =
          err?.error?.message ?? 'Downloading CV failed. Please try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Download failed',
          detail: message,
        });
      },
    });
  }

  onDelete(file: CvDocumentListItem): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this file?',
      header: 'Confirm deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cvApiService.deleteCv(file.id).subscribe({
          next: () => {
            this.cvFiles.update((list) => list.filter((f) => f.id !== file.id));
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'CV file deleted successfully.',
            });
          },
          error: (err) => {
            const message =
              err?.error?.message ?? 'Deleting CV failed. Please try again.';
            this.messageService.add({
              severity: 'error',
              summary: 'Delete failed',
              detail: message,
            });
          },
        });
      },
    });
  }
}
