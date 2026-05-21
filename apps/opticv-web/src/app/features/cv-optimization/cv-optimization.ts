import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { from, mergeMap, switchMap } from 'rxjs';
import { JobUpload } from './components/job-upload/job-upload';
import { AccordionModule } from 'primeng/accordion';
import {
  JobApplication,
  KeywordGapResult,
  PromptType,
  ResumeAutopsyResult,
  SummaryRewriteResult,
} from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';
import { OptimizationResultPanel } from './components/optimization-result-panel/optimization-result-panel';
import { AtsScore } from './components/ats-score/ats-score';
import { KeywordGap } from './components/keyword-gap/keyword-gap';
import { SummaryRewrite } from './components/summary-rewrite/summary-rewrite';

function isResumeAutopsyResult(value: unknown): value is ResumeAutopsyResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['overallScore'] === 'number' &&
    typeof v['predictedScoreAfterFixes'] === 'number' &&
    typeof v['topPriority'] === 'string' &&
    typeof v['summary'] === 'string' &&
    Array.isArray(v['issues']) &&
    Array.isArray(v['strengths'])
  );
}

function isKeywordGapResult(value: unknown): value is KeywordGapResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['matchScore'] === 'number' && Array.isArray(v['missingKeywords'])
  );
}

function isSummaryRewriteResult(value: unknown): value is SummaryRewriteResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['originalSummary'] === 'string' &&
    Array.isArray(v['variants']) &&
    typeof v['recommendedVariant'] === 'string'
  );
}

@Component({
  selector: 'app-cv-optimization-page',
  imports: [
    JobUpload,
    AccordionModule,
    JsonPipe,
    OptimizationResultPanel,
    AtsScore,
    KeywordGap,
    SummaryRewrite,
  ],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {
  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly PromptType = PromptType;
  readonly results = signal<Map<PromptType, SseJobCompleteEvent>>(new Map());
  readonly isProcessing = signal<Map<PromptType, boolean>>(new Map());

  readonly autopsyResult = computed<ResumeAutopsyResult | null>(() => {
    const r = this.results().get(PromptType.RESUME_AUTOPSY)?.result;
    return isResumeAutopsyResult(r) ? r : null;
  });

  readonly keywordGapResult = computed<KeywordGapResult | null>(() => {
    const r = this.results().get(PromptType.KEYWORD_GAP)?.result;
    return isKeywordGapResult(r) ? r : null;
  });

  readonly summaryRewriteResult = computed<SummaryRewriteResult | null>(() => {
    const r = this.results().get(PromptType.SUMMARY_REWRITE)?.result;
    return isSummaryRewriteResult(r) ? r : null;
  });

  runOptimization(jobApplication: JobApplication): void {
    this.results.set(new Map());
    this.isProcessing.set(new Map());

    from(Object.values(PromptType))
      .pipe(
        mergeMap(
          (promptType) =>
            this.cvOptimizationApiService
              .runSingleOptimizationProcess(jobApplication.id, promptType)
              .pipe(
                switchMap(({ runId }) => {
                  this.isProcessing.update((map) =>
                    new Map(map).set(promptType, true),
                  );
                  return this.cvOptimizationApiService.streamOptimizationEvents(
                    jobApplication.id,
                    runId,
                  );
                }),
              ),
          3,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event: SseJobCompleteEvent) => {
          console.log('SSE - job complete event:', event);
          this.isProcessing.update((map) =>
            new Map(map).set(event.promptType, false),
          );
          this.results.update((map) =>
            new Map(map).set(event.promptType, event),
          );
        },
        error: (err) => console.error('Optimization stream error', err),
      });
  }
}
