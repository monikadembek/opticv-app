import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  KeywordGapMissingKeyword,
  KeywordGapResult,
} from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

const IMPORTANCE_RANK: Readonly<
  Record<KeywordGapMissingKeyword['importance'], number>
> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getImportanceRank(
  importance: KeywordGapMissingKeyword['importance'],
): number {
  return IMPORTANCE_RANK[importance] ?? Object.keys(IMPORTANCE_RANK).length;
}

function byImportance(
  a: KeywordGapMissingKeyword,
  b: KeywordGapMissingKeyword,
): number {
  return getImportanceRank(a.importance) - getImportanceRank(b.importance);
}

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
  readonly experiencePositions = input<string[]>([]);
  readonly keywordBulletPositions = input<Map<string, number>>(new Map());
  readonly selectedAcronymIssues = input<string[]>([]);
  readonly acronymEdits = input<Map<string, string>>(new Map());
  readonly activeAcronymEditKey = input<string | null>(null);
  readonly editedAcronymText = input<string>('');
  readonly acronymBulletPositions = input<Map<string, number>>(new Map());
  readonly selectedJobTitle = input<boolean>(false);
  readonly activeJobTitleEdit = input<boolean>(false);
  readonly editedJobTitleText = input<string>('');

  readonly keywordToggled = output<string>();
  readonly keywordEditStarted = output<string>();
  readonly keywordEditSaved = output<{ key: string; text: string }>();
  readonly keywordEditCancelled = output<void>();
  readonly keywordEditTextChanged = output<string>();
  readonly keywordBulletPositionSelected = output<{
    keyword: string;
    experienceIndex: number | null;
  }>();
  readonly acronymIssueToggled = output<string>();
  readonly acronymEditStarted = output<string>();
  readonly acronymEditSaved = output<{ key: string; text: string }>();
  readonly acronymEditCancelled = output<void>();
  readonly acronymEditTextChanged = output<string>();
  readonly acronymBulletPositionSelected = output<{
    term: string;
    experienceIndex: number | null;
  }>();
  readonly jobTitleToggled = output<void>();
  readonly jobTitleEditStarted = output<void>();
  readonly jobTitleEditSaved = output<string>();
  readonly jobTitleEditCancelled = output<void>();
  readonly jobTitleEditTextChanged = output<string>();

  readonly ringCircumference = RING_CIRCUMFERENCE;

  readonly missingLikelyHas = computed(() =>
    this.result()
      .missingKeywords.filter((k) => k.candidateLikelyHas)
      .sort(byImportance),
  );

  readonly missingGenuinelyLacks = computed(() =>
    this.result()
      .missingKeywords.filter((k) => !k.candidateLikelyHas)
      .sort(byImportance),
  );

  readonly exactMatchedKeywords = computed(() =>
    this.result().matchedKeywords.filter((k) => k.matchType === 'exact'),
  );

  readonly semanticMatchedKeywords = computed(() =>
    this.result().matchedKeywords.filter((k) => k.matchType !== 'exact'),
  );

  readonly isUnderweightedExpanded = signal(false);
  readonly isFabricationWarningsExpanded = signal(false);

  toggleUnderweighted(): void {
    this.isUnderweightedExpanded.update((expanded) => !expanded);
  }

  toggleFabricationWarnings(): void {
    this.isFabricationWarningsExpanded.update((expanded) => !expanded);
  }

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

  getKeywordPosition(keyword: string): number | null {
    return this.keywordBulletPositions().get(keyword) ?? null;
  }

  onPositionChange(keyword: string, value: string): void {
    const experienceIndex = value === '' ? null : Number(value);
    this.keywordBulletPositionSelected.emit({ keyword, experienceIndex });
  }

  isAcronymSelected(term: string): boolean {
    return this.selectedAcronymIssues().includes(term);
  }

  toggleAcronymIssue(term: string): void {
    this.acronymIssueToggled.emit(term);
  }

  isEditingAcronym(term: string): boolean {
    return this.activeAcronymEditKey() === term;
  }

  isEditedAcronym(term: string): boolean {
    return this.acronymEdits().has(term);
  }

  getAcronymDisplayFixedText(term: string): string {
    return (
      this.acronymEdits().get(term) ??
      this.result().acronymIssues.find((a) => a.term === term)?.fix ??
      term
    );
  }

  getAcronymPosition(term: string): number | null {
    return this.acronymBulletPositions().get(term) ?? null;
  }

  onAcronymPositionChange(term: string, value: string): void {
    const experienceIndex = value === '' ? null : Number(value);
    this.acronymBulletPositionSelected.emit({ term, experienceIndex });
  }

  isEditingJobTitle(): boolean {
    return this.activeJobTitleEdit();
  }

  getJobTitleDisplayText(): string {
    if (this.isEditingJobTitle()) return this.editedJobTitleText();
    return this.result().jobTitleMatch?.suggestedTitle ?? '';
  }

  readonly jobTitleBadgeClass = computed(() => {
    const matchLevel = this.result().jobTitleMatch?.matchLevel;
    if (matchLevel === 'exact') return 'bg-emerald-100 text-emerald-700';
    if (matchLevel === 'close') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  });
}
