import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type {
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
} from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';

const ANGLE_LABELS: Record<SummaryRewriteVariantAngle, string> = {
  achievement_led: 'Achievement-led',
  identity_led: 'Identity-led',
  mission_led: 'Mission-led',
};

@Component({
  selector: 'app-summary-rewrite',
  templateUrl: './summary-rewrite.html',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryRewrite {
  readonly result = input.required<SummaryRewriteResult>();
  readonly selectedAngle = input<SummaryRewriteVariantAngle | null>(null);

  readonly angleSelected = output<SummaryRewriteVariantAngle>();

  readonly angleLabels = ANGLE_LABELS;

  readonly isNoSummary = computed(
    () => this.result().originalSummary === 'No summary present',
  );

  selectVariant(angle: SummaryRewriteVariantAngle): void {
    this.angleSelected.emit(angle);
  }
}
