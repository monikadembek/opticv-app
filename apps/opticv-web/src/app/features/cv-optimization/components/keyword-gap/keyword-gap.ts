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
import type { KeywordGapResult } from '@opticv/datatypes';
import { CvOptimizationApiService } from '../../services/cv-optimization-api.service';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

@Component({
  imports: [ButtonModule, TextareaModule, TooltipModule],
  selector: 'app-keyword-gap',
  templateUrl: './keyword-gap.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeywordGap {
  private readonly apiService = inject(CvOptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  readonly result = input.required<KeywordGapResult>();
  readonly optimizationResultId = input<string | null>(null);

  readonly applied = output<string>();

  readonly ringCircumference = RING_CIRCUMFERENCE;

  readonly selectedKeywords = signal<Set<string>>(new Set());
  readonly editedText = signal('');
  readonly userHasEdited = signal(false);
  readonly isSaving = signal(false);
  readonly saveErrorMsg = signal<string | null>(null);

  readonly missingLikelyHas = computed(() =>
    this.result().missingKeywords.filter((k) => k.candidateLikelyHas),
  );

  readonly missingGenuinelyLacks = computed(() =>
    this.result().missingKeywords.filter((k) => !k.candidateLikelyHas),
  );

  readonly scoreColor = computed(() => {
    const score = this.result().matchScore;
    if (score <= 49) return 'red';
    if (score <= 74) return 'amber';
    return 'green';
  });

  readonly strokeColor = computed(() => {
    const score = this.result().matchScore;
    if (score <= 49) return '#ef4444';
    if (score <= 74) return '#f59e0b';
    return '#22c55e';
  });

  readonly strokeDashoffset = computed(
    () => RING_CIRCUMFERENCE * (1 - this.result().matchScore / 100),
  );

  readonly hasSelection = computed(() => this.selectedKeywords().size > 0);

  toggleKeyword(keyword: string): void {
    const current = new Set(this.selectedKeywords());
    if (current.has(keyword)) {
      current.delete(keyword);
    } else {
      current.add(keyword);
    }
    this.selectedKeywords.set(current);

    if (!this.userHasEdited()) {
      this.editedText.set([...current].join('\n'));
    }

    if (current.size === 0) {
      this.userHasEdited.set(false);
      this.editedText.set('');
    }
  }

  onTextareaInput(value: string): void {
    this.editedText.set(value);
    this.userHasEdited.set(true);
  }

  applyKeywords(): void {
    const resultId = this.optimizationResultId();
    if (!resultId || !this.hasSelection()) return;

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
            detail: 'Selected keywords saved and will be applied to your cv',
          });
        },
        error: () => this.saveErrorMsg.set('Failed to save. Please try again.'),
      });
  }
}
