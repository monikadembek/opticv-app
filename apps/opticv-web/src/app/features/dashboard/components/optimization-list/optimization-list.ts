import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { JobApplicationListItem } from '@opticv/datatypes';
import { CvStore } from '../../../../core/stores/cv.store';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-optimization-list',
  imports: [DatePipe, RouterLink, ButtonModule, TableModule],
  templateUrl: './optimization-list.html',
  styleUrl: './optimization-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
})
export class OptimizationList {
  private readonly router = inject(Router);
  readonly cvStore = inject(CvStore);

  readonly items = input.required<JobApplicationListItem[]>();
  readonly isLoading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly retryLoadingOptimizations = output<void>();
  readonly deleteOptimizations = output<JobApplicationListItem>();

  loadOptimizations(): void {
    this.retryLoadingOptimizations.emit();
  }

  onOpen(item: JobApplicationListItem): void {
    this.router.navigate(['/cv-optimization', item.id]);
  }

  onDelete(item: JobApplicationListItem): void {
    this.deleteOptimizations.emit(item);
  }
}
