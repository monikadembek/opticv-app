import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type {
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
} from '@opticv/datatypes';

const ANGLE_LABELS: Record<SummaryRewriteVariantAngle, string> = {
  achievement_led: 'Achievement-led',
  identity_led: 'Identity-led',
  mission_led: 'Mission-led',
};

@Component({
  selector: 'app-summary-rewrite',
  templateUrl: './summary-rewrite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryRewrite {
  readonly result = input.required<SummaryRewriteResult>();

  readonly angleLabels = ANGLE_LABELS;

  readonly isNoSummary = computed(
    () => this.result().originalSummary === 'No summary present',
  );
}
