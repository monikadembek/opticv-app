import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
} from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

const ANGLE_LABELS: Record<SummaryRewriteVariantAngle, string> = {
  achievement_led: 'Achievement-led',
  identity_led: 'Identity-led',
  mission_led: 'Mission-led',
};

@Component({
  selector: 'app-summary-rewrite',
  templateUrl: './summary-rewrite.html',
  imports: [ButtonModule, FormsModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryRewrite {
  readonly result = input.required<SummaryRewriteResult>();
  readonly selectedAngle = input<SummaryRewriteVariantAngle | null>(null);

  readonly angleSelected = output<SummaryRewriteVariantAngle>();
  readonly angleReset = output<void>();
  readonly summaryTextEdited = output<string | null>();

  readonly angleLabels = ANGLE_LABELS;

  readonly isNoSummary = computed(
    () => this.result().originalSummary === 'No summary present',
  );

  readonly selectedVariantText = computed(() => {
    const angle = this.selectedAngle();
    if (!angle) return null;
    return this.result().variants.find((v) => v.angle === angle)?.text ?? null;
  });

  readonly editableText = signal<string>('');
  readonly isModified = computed(
    () => this.editableText() !== (this.selectedVariantText() ?? ''),
  );

  constructor() {
    effect(() => {
      const text = this.selectedVariantText();
      this.editableText.set(text ?? '');
    });
  }

  selectVariant(angle: SummaryRewriteVariantAngle): void {
    this.angleSelected.emit(angle);
  }

  resetVariant(): void {
    this.angleReset.emit();
  }

  onTextChange(value: string): void {
    console.log('onTextChange(): ', value);
    this.editableText.set(value);
    const base = this.selectedVariantText();
    this.summaryTextEdited.emit(value === base ? null : value);
  }
}
