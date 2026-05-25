import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type {
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
} from '@opticv/datatypes';
import { CvOptimizationApiService } from '../../services/cv-optimization-api.service';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

const ANGLE_LABELS: Record<SummaryRewriteVariantAngle, string> = {
  achievement_led: 'Achievement-led',
  identity_led: 'Identity-led',
  mission_led: 'Mission-led',
};

@Component({
  selector: 'app-summary-rewrite',
  templateUrl: './summary-rewrite.html',
  imports: [TextareaModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryRewrite {
  private readonly apiService = inject(CvOptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly result = input.required<SummaryRewriteResult>();
  readonly optimizationResultId = input<string | null>(null);

  readonly applied = output<string>();

  readonly angleLabels = ANGLE_LABELS;

  readonly selectedAngle = signal<SummaryRewriteVariantAngle | null>(null);
  readonly editedText = signal('');
  readonly isSaving = signal(false);
  readonly saveErrorMsg = signal<string | null>(null);

  readonly isNoSummary = computed(
    () => this.result().originalSummary === 'No summary present',
  );

  selectVariant(angle: SummaryRewriteVariantAngle): void {
    const text =
      this.result().variants.find((v) => v.angle === angle)?.text ?? '';
    this.selectedAngle.set(angle);
    this.editedText.set(text);
    this.saveErrorMsg.set(null);
  }

  applySelected(): void {
    const resultId = this.optimizationResultId();
    if (!resultId || !this.selectedAngle()) return;

    this.isSaving.set(true);
    this.saveErrorMsg.set(null);

    this.apiService
      .saveUserOutput(resultId, this.editedText())
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.applied.emit(this.editedText());
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: 'Applied selected version of summary',
          });
        },
        error: () => this.saveErrorMsg.set('Failed to save. Please try again.'),
      });
  }
}
