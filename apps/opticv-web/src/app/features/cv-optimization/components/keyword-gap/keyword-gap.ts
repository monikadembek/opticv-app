import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { KeywordGapResult } from '@opticv/datatypes';

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

@Component({
  selector: 'app-keyword-gap',
  templateUrl: './keyword-gap.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeywordGap {
  readonly result = input.required<KeywordGapResult>();

  readonly ringCircumference = RING_CIRCUMFERENCE;

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

  scoreColorClass(): string {
    const score = this.result().matchScore;
    if (score <= 49) return 'text-red-500';
    if (score <= 74) return 'text-amber-500';
    return 'text-green-500';
  }

  strokeColor(): string {
    const score = this.result().matchScore;
    if (score <= 49) return '#ef4444';
    if (score <= 74) return '#f59e0b';
    return '#22c55e';
  }

  strokeDashoffset(): number {
    return RING_CIRCUMFERENCE * (1 - this.result().matchScore / 100);
  }
}
