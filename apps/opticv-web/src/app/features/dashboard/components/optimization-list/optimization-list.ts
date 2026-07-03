import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { JobApplicationListItem } from '@opticv/datatypes';
import { JobApplicationApiService } from '../../../../core/services/job-application-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import posthog from 'posthog-js';

@Component({
  selector: 'app-optimization-list',
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './optimization-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class OptimizationList implements OnInit {
  private readonly jobApplicationApiService = inject(JobApplicationApiService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<JobApplicationListItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOptimizations();
  }

  loadOptimizations(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.jobApplicationApiService
      .getJobApplications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.items.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(
            err?.error?.message ??
              'Failed to load optimizations. Please try again.',
          );
          this.isLoading.set(false);
        },
      });
  }

  onOpen(item: JobApplicationListItem): void {
    this.router.navigate(['/cv-optimization', item.id]);
  }

  onDelete(item: JobApplicationListItem): void {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to delete this optimization? This will permanently remove the job application and all associated results.',
      header: 'Confirm deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.jobApplicationApiService
          .deleteJobApplication(item.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.items.update((list) => list.filter((i) => i.id !== item.id));
              this.messageService.add({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Optimization deleted successfully.',
              });

              posthog.capture('optimization_deleted', {
                page: 'dashboard',
                button_icon: 'trash',
                id: item.id,
              });
            },
            error: (err) => {
              const message =
                err?.error?.message ??
                'Failed to delete optimization. Please try again.';
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
