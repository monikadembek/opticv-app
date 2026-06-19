import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { KeywordGapResult } from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

@Component({
  imports: [ButtonModule, InputTextModule, TooltipModule],
  selector: 'app-keyword-gap',
  templateUrl: './keyword-gap.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeywordGap {
  readonly result = input.required<KeywordGapResult>();
  readonly selectedKeywords = input<string[]>([]);
  readonly keywordEdits = input<Map<string, string>>(new Map());
  readonly activeKeywordEditKey = input<string | null>(null);
  readonly editedKeywordText = input<string>('');

  readonly keywordToggled = output<string>();
  readonly keywordEditStarted = output<string>();
  readonly keywordEditSaved = output<{ key: string; text: string }>();
  readonly keywordEditCancelled = output<void>();
  readonly keywordEditTextChanged = output<string>();

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

  readonly strokeColor = computed(() => {
    const score = this.result().matchScore;
    if (score <= 49) return '#ef4444';
    if (score <= 74) return '#f59e0b';
    return '#22c55e';
  });

  readonly strokeDashoffset = computed(
    () => RING_CIRCUMFERENCE * (1 - this.result().matchScore / 100),
  );

  isSelected(keyword: string): boolean {
    return this.selectedKeywords().includes(keyword);
  }

  toggleKeyword(keyword: string): void {
    this.keywordToggled.emit(keyword);
  }

  isEditingKeyword(keyword: string): boolean {
    return this.activeKeywordEditKey() === keyword;
  }

  isEditedKeyword(keyword: string): boolean {
    return this.keywordEdits().has(keyword);
  }

  getKeywordDisplayText(keyword: string): string {
    return this.keywordEdits().get(keyword) ?? keyword;
  }
}
