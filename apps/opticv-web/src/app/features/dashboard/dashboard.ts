import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CvFileList } from './components/cv-file-list/cv-file-list';
import { OptimizationList } from './components/optimization-list/optimization-list';
import { CvStore } from '../../core/stores/cv.store';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JobApplicationListItem } from '@opticv/datatypes';
import posthog from 'posthog-js';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Supabase } from '../../core/auth/services/supabase';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [
    TabsModule,
    CvFileList,
    OptimizationList,
    ConfirmDialogModule,
    DatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class Dashboard implements OnInit {
  readonly cvStore = inject(CvStore);
  private readonly jobApplicationApiService = inject(JobApplicationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly supabaseService = inject(Supabase);

  readonly optimizationsItems = signal<JobApplicationListItem[]>([]);
  readonly isLoadingOptimizations = signal(false);
  readonly optimizationsError = signal<string | null>(null);

  lastActivityTime = signal<Date | null>(null);

  constructor() {
    effect(() => {
      const lastActivities = [];

      const lastSignIn = this.supabaseService.currentUser()?.last_sign_in_at;
      if (lastSignIn) {
        lastActivities.push(new Date(lastSignIn));
      }

      if (this.cvStore.hasCv()) {
        lastActivities.push(new Date(this.cvStore.cvList()[0].createdAt));
      }

      if (this.optimizationsItems().length > 0) {
        lastActivities.push(new Date(this.optimizationsItems()[0].updatedAt));
      }

      if (lastActivities.length === 0) {
        return;
      }

      if (lastActivities.length === 1) {
        this.lastActivityTime.set(lastActivities[0]);
      } else {
        lastActivities.sort((a, b) => b.getTime() - a.getTime());
        this.lastActivityTime.set(lastActivities[0]);
      }
    });
  }

  ngOnInit(): void {
    // this.cvStore.loadUserCVs();
    this.loadOptimizations();
  }

  loadOptimizations(): void {
    this.isLoadingOptimizations.set(true);
    this.optimizationsError.set(null);
    this.jobApplicationApiService
      .getJobApplications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.optimizationsItems.set(data);
          this.isLoadingOptimizations.set(false);
        },
        error: (err) => {
          this.optimizationsError.set(
            err?.error?.message ??
              'Failed to load optimizations. Please try again.',
          );
          this.isLoadingOptimizations.set(false);
        },
      });
  }

  onDeleteOptimizations(item: JobApplicationListItem): void {
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
              this.optimizationsItems.update((list) =>
                list.filter((i) => i.id !== item.id),
              );
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
