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
import { filter, from, mergeMap, switchMap } from 'rxjs';
import {
  JobSubmittedData,
  JobUpload,
} from './components/job-upload/job-upload';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  BulletSelectionKey,
  BulletUpgradeResult,
  CoverLetterResult,
  CvStructuredData,
  InterviewPrepResult,
  KeywordGapResult,
  PromptType,
  ResumeAutopsyResult,
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
  UserSelections,
} from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';
import { CvExportService } from './services/cv-export.service';
import { OptimizationResultPanel } from './components/optimization-result-panel/optimization-result-panel';
import { AtsScore } from './components/ats-score/ats-score';
import { KeywordGap } from './components/keyword-gap/keyword-gap';
import { SummaryRewrite } from './components/summary-rewrite/summary-rewrite';
import { BulletRewriter } from './components/bullet-rewriter/bullet-rewriter';
import { CoverLetterEditor } from './components/cover-letter-editor/cover-letter-editor';
import { InterviewPrep } from './components/interview-prep/interview-prep';
import { CvTemplateId } from './cv-templates';
import { CvTemplateSelector } from './components/cv-template-selector/cv-template-selector';
import { applySelectionsToCV } from './utils/apply-selections';

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

function isBulletUpgradeResult(value: unknown): value is BulletUpgradeResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['positions']) &&
    typeof v['verbDiversityCheck'] === 'object' &&
    v['verbDiversityCheck'] !== null
  );
}

function isCoverLetterResult(value: unknown): value is CoverLetterResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['variants']) &&
    (v['variants'] as unknown[]).length > 0 &&
    typeof v['recommendedVariant'] === 'string' &&
    typeof v['salutation'] === 'string'
  );
}

function isInterviewPrepResult(value: unknown): value is InterviewPrepResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['questions']) && Array.isArray(v['preparationTips']);
}

const ActivePrompts = [PromptType.SUMMARY_REWRITE];

@Component({
  selector: 'app-cv-optimization-page',
  imports: [
    JobUpload,
    AccordionModule,
    ButtonModule,
    TooltipModule,
    JsonPipe,
    OptimizationResultPanel,
    AtsScore,
    KeywordGap,
    SummaryRewrite,
    BulletRewriter,
    CoverLetterEditor,
    InterviewPrep,
    CvTemplateSelector,
  ],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {
  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly cvExportService = inject(CvExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly PromptType = PromptType;
  readonly results = signal<Map<PromptType, SseJobCompleteEvent>>(new Map());
  readonly isProcessing = signal<Map<PromptType, boolean>>(new Map());
  readonly jobApplicationId = signal<string | null>(null);
  readonly cvStructuredData = signal<CvStructuredData | null>(null);
  readonly selections = signal<UserSelections>({
    selectedSummaryAngle: null,
    customSummaryText: null,
    selectedBullets: [],
    selectedKeywords: [],
  });
  readonly isExportingPdf = signal(false);
  readonly isExportingDocx = signal(false);
  readonly selectedTemplate = signal<CvTemplateId>('ats');

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

  readonly bulletUpgradeResult = computed<BulletUpgradeResult | null>(() => {
    const r = this.results().get(PromptType.BULLET_UPGRADE)?.result;
    return isBulletUpgradeResult(r) ? r : null;
  });

  readonly coverLetterResult = computed<CoverLetterResult | null>(() => {
    const r = this.results().get(PromptType.COVER_LETTER)?.result;
    return isCoverLetterResult(r) ? r : null;
  });

  readonly interviewPrepResult = computed<InterviewPrepResult | null>(() => {
    const r = this.results().get(PromptType.INTERVIEW_PREP)?.result;
    return isInterviewPrepResult(r) ? r : null;
  });

  readonly mergedCv = computed<CvStructuredData | null>(() => {
    const cv = this.cvStructuredData();
    if (!cv) return null;
    return applySelectionsToCV(
      cv,
      this.selections(),
      this.summaryRewriteResult(),
      this.bulletUpgradeResult(),
      this.keywordGapResult(),
    );
  });

  readonly isProcessingAny = computed(() =>
    ActivePrompts.some((p) => this.isProcessing().get(p) === true),
  );

  readonly canExportCv = computed(() => {
    const s = this.selections();
    return (
      !this.isProcessingAny() &&
      this.mergedCv() !== null &&
      (s.selectedSummaryAngle !== null ||
        s.selectedBullets.length > 0 ||
        s.selectedKeywords.length > 0)
    );
  });

  readonly retryablePromptTypes = computed<Set<PromptType>>(() => {
    const retryable = new Set<PromptType>();
    if (this.jobApplicationId() === null) return retryable;

    const promptResultPairs: Array<[PromptType, unknown]> = [
      [PromptType.RESUME_AUTOPSY, this.autopsyResult()],
      [PromptType.KEYWORD_GAP, this.keywordGapResult()],
      [PromptType.SUMMARY_REWRITE, this.summaryRewriteResult()],
      [PromptType.BULLET_UPGRADE, this.bulletUpgradeResult()],
      [PromptType.COVER_LETTER, this.coverLetterResult()],
      [PromptType.INTERVIEW_PREP, this.interviewPrepResult()],
    ];

    for (const [promptType, computedResult] of promptResultPairs) {
      if (this.isProcessing().get(promptType)) continue;
      const status = this.results().get(promptType)?.status;
      if (
        status === 'failed' ||
        (status === 'completed' && computedResult === null)
      ) {
        retryable.add(promptType);
      }
    }

    return retryable;
  });

  runOptimization({ jobApplication, extractedData }: JobSubmittedData): void {
    this.results.set(new Map());
    this.isProcessing.set(new Map());
    this.selections.set({
      selectedSummaryAngle: null,
      customSummaryText: null,
      selectedBullets: [],
      selectedKeywords: [],
    });
    this.jobApplicationId.set(jobApplication.id);
    this.cvStructuredData.set(extractedData);

    from(Object.values(PromptType))
      .pipe(
        filter((prompt) => ActivePrompts.includes(prompt)),
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

  retryOptimization(promptType: PromptType): void {
    const jobApplicationId = this.jobApplicationId();
    if (jobApplicationId === null) return;

    this.isProcessing.update((map) => new Map(map).set(promptType, true));

    this.cvOptimizationApiService
      .runSingleOptimizationProcess(jobApplicationId, promptType)
      .pipe(
        switchMap(({ runId }) =>
          this.cvOptimizationApiService.streamOptimizationEvents(
            jobApplicationId,
            runId,
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event: SseJobCompleteEvent) => {
          this.isProcessing.update((map) =>
            new Map(map).set(promptType, false),
          );
          this.results.update((map) =>
            new Map(map).set(event.promptType, event),
          );
        },
        error: (err) => {
          console.error('Retry stream error', err);
          this.isProcessing.update((map) =>
            new Map(map).set(promptType, false),
          );
        },
      });
  }

  onAngleSelected(angle: SummaryRewriteVariantAngle): void {
    this.selections.update((s) => ({
      ...s,
      selectedSummaryAngle: angle,
      customSummaryText: null,
    }));
  }

  onSummaryTextEdited(text: string | null): void {
    this.selections.update((s) => ({ ...s, customSummaryText: text }));
  }

  onBulletToggled(key: BulletSelectionKey): void {
    this.selections.update((s) => {
      const exists = s.selectedBullets.some(
        (b) =>
          b.company === key.company &&
          b.title === key.title &&
          b.originalText === key.originalText,
      );
      const selectedBullets = exists
        ? s.selectedBullets.filter(
            (b) =>
              !(
                b.company === key.company &&
                b.title === key.title &&
                b.originalText === key.originalText
              ),
          )
        : [...s.selectedBullets, key];
      return { ...s, selectedBullets };
    });
  }

  onKeywordToggled(keyword: string): void {
    this.selections.update((s) => {
      const selectedKeywords = s.selectedKeywords.includes(keyword)
        ? s.selectedKeywords.filter((k) => k !== keyword)
        : [...s.selectedKeywords, keyword];
      return { ...s, selectedKeywords };
    });
  }

  exportCvAsPdf(): void {
    const cv = this.mergedCv();
    if (!cv) return;
    this.isExportingPdf.set(true);
    this.cvExportService
      .exportToPdf(cv, this.selectedTemplate())
      .finally(() => {
        this.isExportingPdf.set(false);
      });
  }

  exportCvAsDocx(): void {
    const cv = this.mergedCv();
    if (!cv) return;
    this.isExportingDocx.set(true);
    this.cvExportService
      .exportToDocx(cv, this.selectedTemplate())
      .finally(() => {
        this.isExportingDocx.set(false);
      });
  }
}
