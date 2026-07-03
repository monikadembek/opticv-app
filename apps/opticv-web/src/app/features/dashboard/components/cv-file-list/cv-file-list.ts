import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileListItem } from '../cv-file-list-item/cv-file-list-item';
import { CvApiService } from '../../services/cv-api.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import posthog from 'posthog-js';

@Component({
  selector: 'app-cv-file-list',
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    CvFileListItem,
  ],
  templateUrl: './cv-file-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class CvFileList implements OnInit {
  private readonly cvApiService = inject(CvApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cvFiles = signal<CvDocumentListItem[]>([]);
  readonly isCvsLoading = signal(false);
  readonly cvsError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.isCvsLoading.set(true);
    this.cvsError.set(null);
    this.cvApiService
      .getUserCvs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (files) => {
          this.cvFiles.set(files);
          this.isCvsLoading.set(false);
        },
        error: (err) => {
          this.cvsError.set(
            err?.error?.message ?? 'Failed to load files. Please try again.',
          );
          this.isCvsLoading.set(false);
        },
      });
  }

  downloadCv(file: CvDocumentListItem): void {
    this.cvApiService.downloadCv(file.id).subscribe({
      next: ({ url }) => {
        if (isPlatformBrowser(this.platformId)) {
          window.open(url, '_blank');

          posthog.capture('original_cv_downloaded', {
            page: 'dashboard',
            button_icon: 'download',
            file_id: file.id,
            file_name: file.fileName,
          });
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

  deleteCv(file: CvDocumentListItem): void {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to delete this file? This will also remove all associated optimizations.',
      header: 'Confirm deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        posthog.capture('cv_deleted', {
          page: 'dashboard',
          button_icon: 'trash',
          file_id: file.id,
          file_name: file.fileName,
        });
        this.cvApiService
          .deleteCv(file.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.cvFiles.update((list) =>
                list.filter((f) => f.id !== file.id),
              );
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
