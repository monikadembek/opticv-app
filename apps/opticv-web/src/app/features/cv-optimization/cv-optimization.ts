import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  debounceTime,
  filter,
  forkJoin,
  from,
  mergeMap,
  Subject,
  switchMap,
} from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import {
  BulletEditKey,
  BulletSelectionKey,
  BulletUpgradeResult,
  BulletUserState,
  CoverLetterHookType,
  CoverLetterResult,
  CoverLetterUserState,
  CvStructuredData,
  InterviewPrepResult,
  JobApplication,
  JobApplicationWithCv,
  KeywordGapResult,
  LinkedInRewriteResult,
  PromptType,
  ResumeAutopsyResult,
  SummaryRewriteResult,
  SummaryRewriteVariantAngle,
  SummaryUserState,
  UserSelections,
} from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';
import { CvExportService } from './services/cv-export.service';
import { CvApiService } from '../../core/services/cv-api.service';
import {
  JobUpload,
  JobSubmittedData,
} from './components/job-upload/job-upload';
import { AtsScore } from './components/ats-score/ats-score';
import { KeywordGap } from './components/keyword-gap/keyword-gap';
import { SummaryRewrite } from './components/summary-rewrite/summary-rewrite';
import { BulletRewriter } from './components/bullet-rewriter/bullet-rewriter';
import { CoverLetterEditor } from './components/cover-letter-editor/cover-letter-editor';
import { InterviewPrep } from './components/interview-prep/interview-prep';
import { LinkedInUpdates } from './components/linkedin-updates/linkedin-updates';
import {
  CV_TEMPLATES,
  CvTemplateId,
  DEFAULT_ACCENT_COLOR,
} from './cv-templates';
import { SubscriptionTier, TIER_LIMITS } from '@opticv/datatypes';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { applySelectionsToCV } from './utils/apply-selections';
import {
  recomputeAtsProjection,
  recomputeKeywordGapResult,
} from './utils/recompute-scores';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';
import { OptimSidebar } from './components/optim-sidebar/optim-sidebar';
import { SectionCard } from './components/section-card/section-card';
import { JobInfoBanner } from './components/job-info-banner/job-info-banner';
import { ExportFooter } from './components/export-footer/export-footer';
import { MobileTabs } from './components/mobile-tabs/mobile-tabs';
import { SectionStatus } from './models';
import posthog from 'posthog-js';

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

function isLinkedInRewriteResult(
  value: unknown,
): value is LinkedInRewriteResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['headlineVariants']) &&
    typeof v['aboutRewrite'] === 'object' &&
    v['aboutRewrite'] !== null &&
    Array.isArray(v['additionalRecommendations']) &&
    Array.isArray(v['targetSearchQueries'])
  );
}

const ActivePrompts = [
  PromptType.RESUME_AUTOPSY,
  PromptType.KEYWORD_GAP,
  PromptType.BULLET_UPGRADE,
  PromptType.SUMMARY_REWRITE,
  PromptType.COVER_LETTER,
  PromptType.INTERVIEW_PREP,
  PromptType.LINKEDIN_REWRITE,
];

@Component({
  selector: 'app-cv-optimization-page',
  imports: [
    JobUpload,
    ButtonModule,
    RouterLink,
    AtsScore,
    KeywordGap,
    SummaryRewrite,
    BulletRewriter,
    CoverLetterEditor,
    InterviewPrep,
    LinkedInUpdates,
    OptimSidebar,
    SectionCard,
    JobInfoBanner,
    ExportFooter,
    MobileTabs,
  ],
  templateUrl: './cv-optimization.html',
  styleUrl: './cv-optimization.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization implements OnInit {
  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly cvExportService = inject(CvExportService);
  private readonly cvApiService = inject(CvApiService);
  private readonly jobApplicationApiService = inject(JobApplicationApiService);
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly persistSubject = new Subject<void>();
  private readonly persistSummarySubject = new Subject<void>();
  private readonly persistCoverLetterSubject = new Subject<void>();
  private scrollObserver: IntersectionObserver | null = null;

  readonly PromptType = PromptType;
  readonly results = signal<Map<PromptType, SseJobCompleteEvent>>(new Map());
  readonly isProcessing = signal<Map<PromptType, boolean>>(new Map());
  readonly jobApplicationId = signal<string | null>(null);
  readonly preselectedCvId = signal<string | null>(null);
  readonly cvStructuredData = signal<CvStructuredData | null>(null);
  readonly selections = signal<UserSelections>({
    selectedSummaryAngle: null,
    customSummaryText: null,
    selectedBullets: [],
    selectedKeywords: [],
  });
  readonly isExportingPdf = signal(false);
  readonly isExportingDocx = signal(false);
  readonly selectedTemplate = signal<CvTemplateId>('default');
  readonly accentColor = signal<string>(DEFAULT_ACCENT_COLOR);
  readonly allowedTemplateIds = computed<CvTemplateId[]>(() => {
    const tier: SubscriptionTier =
      this.userSettingsApiService.userProfile.value()?.subscription?.tier ??
      'FREE';
    const allowed = TIER_LIMITS[tier].allowedTemplates;
    return allowed === 'ALL'
      ? CV_TEMPLATES.map((t) => t.id)
      : (allowed as CvTemplateId[]);
  });
  readonly isStoredMode = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly jobApplication = signal<JobApplicationWithCv | null>(null);
  readonly submittedJobApplication = signal<JobApplication | null>(null);
  readonly bulletEdits = signal<Map<string, string>>(new Map());
  readonly bulletUpgradeResultId = signal<string | null>(null);
  readonly summaryRewriteResultId = signal<string | null>(null);
  readonly coverLetterResultId = signal<string | null>(null);
  readonly selectedCoverLetterVariant = signal<CoverLetterHookType | null>(
    null,
  );
  readonly editedCoverLetterContent = signal<string | null>(null);
  readonly activeBulletEditKey = signal<string | null>(null);
  readonly editedBulletText = signal<string>('');
  readonly selectedMissingBullets = signal<
    Array<{ forPosition: string; suggestedBullet: string }>
  >([]);
  readonly missingBulletEdits = signal<Map<string, string>>(new Map());
  readonly removedBullets = signal<BulletSelectionKey[]>([]);
  readonly keywordEdits = signal<Map<string, string>>(new Map());
  readonly activeKeywordEditKey = signal<string | null>(null);
  readonly editedKeywordText = signal<string>('');
  readonly keywordBulletPositions = signal<Map<string, number>>(new Map());

  readonly sidebarExpanded = signal(true);
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly activeSection = signal<string>(PromptType.RESUME_AUTOPSY);
  readonly collapsedSections = signal<ReadonlySet<string>>(new Set());
  private readonly initializedDefaults = signal(false);

  readonly autopsyResult = computed<ResumeAutopsyResult | null>(() => {
    const r = this.results().get(PromptType.RESUME_AUTOPSY)?.result;
    return isResumeAutopsyResult(r) ? r : null;
  });

  readonly keywordGapResult = computed<KeywordGapResult | null>(() => {
    const r = this.results().get(PromptType.KEYWORD_GAP)?.result;
    return isKeywordGapResult(r) ? r : null;
  });

  readonly experiencePositionLabels = computed<string[]>(() =>
    (this.cvStructuredData()?.experience ?? []).map(
      (e) => `${e.company ?? ''} - ${e.title ?? ''}`,
    ),
  );

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

  readonly linkedInResult = computed<LinkedInRewriteResult | null>(() => {
    const r = this.results().get(PromptType.LINKEDIN_REWRITE)?.result;
    return isLinkedInRewriteResult(r) ? r : null;
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
      this.bulletEdits(),
      this.removedBullets(),
      this.selectedMissingBullets(),
      this.missingBulletEdits(),
      this.keywordEdits(),
      this.keywordBulletPositions(),
    );
  });

  readonly isProcessingAny = computed(() =>
    ActivePrompts.some((p) => this.isProcessing().get(p) === true),
  );

  readonly pageState = computed<'initial' | 'processing' | 'completed'>(() => {
    if (!this.jobApplicationId()) return 'initial';
    if (this.isProcessingAny()) return 'processing';
    return 'completed';
  });

  readonly sectionStatuses = computed(
    () => new Map([...this.results().entries()].map(([k, v]) => [k, v.status])),
  );

  readonly processingSet = computed(() => {
    const set = new Set<PromptType>();
    for (const [k, v] of this.isProcessing().entries()) {
      if (v) set.add(k);
    }
    return set;
  });

  readonly atsScore = computed(
    () => this.autopsyResult()?.overallScore ?? null,
  );
  readonly keywordScore = computed(
    () => this.keywordGapResult()?.matchScore ?? null,
  );

  readonly recomputedKeywordGapResult = computed<KeywordGapResult | null>(
    () => {
      const r = this.keywordGapResult();
      if (!r) return null;
      return recomputeKeywordGapResult(r, this.selections().selectedKeywords);
    },
  );

  readonly liveKeywordScore = computed<number | null>(
    () => this.recomputedKeywordGapResult()?.matchScore ?? null,
  );

  readonly projectedAtsScore = computed<number | null>(() => {
    const autopsy = this.autopsyResult();
    if (!autopsy) return null;
    return recomputeAtsProjection(
      autopsy,
      this.selections(),
      this.bulletUpgradeResult(),
      this.selectedMissingBullets(),
    );
  });

  readonly canExportCv = computed(() => {
    if (!this.isProcessingAny() && this.mergedCv() !== null) {
      return true;
    }
    return false;
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
      [PromptType.LINKEDIN_REWRITE, this.linkedInResult()],
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

  readonly hasPartialStoredResults = computed(() => {
    if (!this.isStoredMode()) return false;
    return ActivePrompts.some((p) => !this.results().has(p));
  });

  readonly allSectionIds = computed<string[]>(() => {
    const ids: string[] = [...ActivePrompts];
    if (
      (!this.isStoredMode() && this.submittedJobApplication()) ||
      (this.isStoredMode() && this.jobApplication())
    ) {
      ids.push('JOB_POSTING');
    }
    return ids;
  });

  readonly allSectionsCollapsed = computed(() =>
    this.allSectionIds().every((id) => this.collapsedSections().has(id)),
  );

  constructor() {
    effect(() => {
      const state = this.pageState();
      if (state !== 'initial') {
        // Defer to after render so section elements exist in DOM
        setTimeout(() => this.setupScrollspy(), 0);
      }
    });

    effect(() => {
      const allowed = this.allowedTemplateIds();
      if (!allowed.includes(this.selectedTemplate())) {
        this.selectedTemplate.set(allowed[0] ?? 'default');
      }
    });

    // Quill async-loads and auto-focuses after results arrive, undoing any earlier
    // scroll-to-top. Re-apply scroll after Quill has had time to initialize.
    let scrollScheduled = false;
    effect(() => {
      if (this.isStoredMode() && this.coverLetterResult() && !scrollScheduled) {
        scrollScheduled = true;
        setTimeout(() => window.scrollTo({ top: 0 }), 300);
      }
    });

    effect(() => {
      const state = this.pageState();
      if (this.initializedDefaults()) return;
      if (state === 'initial') return;

      this.collapsedSections.set(
        new Set(
          this.allSectionIds().filter((id) => id !== PromptType.RESUME_AUTOPSY),
        ),
      );
      this.initializedDefaults.set(true);
    });
  }

  ngOnInit(): void {
    this.persistSubject
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.persistBulletState());

    this.persistSummarySubject
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.persistSummaryState());

    this.persistCoverLetterSubject
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.persistCoverLetterState());

    const jobApplicationId =
      this.route.snapshot.paramMap.get('jobApplicationId');
    if (jobApplicationId) {
      this.isStoredMode.set(true);
      history.scrollRestoration = 'manual';
      window.scrollTo({ top: 0 });
      this.loadStoredOptimization(jobApplicationId);
    }

    const cvId = this.route.snapshot.queryParamMap.get('cvId');
    if (cvId) {
      this.preselectedCvId.set(cvId);
    }

    this.breakpointObserver
      .observe('(min-width: 769px) and (max-width: 840px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => this.sidebarExpanded.set(!matches));

    this.destroyRef.onDestroy(() => {
      this.scrollObserver?.disconnect();
      history.scrollRestoration = 'auto';
    });
  }

  private setupScrollspy(): void {
    this.scrollObserver?.disconnect();
    const sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    let initialFired = false;
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        // Skip the initial batch that fires synchronously on observe() — it reflects
        // the browser's restored scroll position, not user intent, and causes the
        // active section to jump on page refresh.
        if (!initialFired) {
          initialFired = true;
          return;
        }
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section');
            if (id) this.activeSection.set(id);
          }
        }
      },
      { rootMargin: '-30% 0px -50% 0px' },
    );

    sections.forEach((el) => this.scrollObserver!.observe(el));
  }

  isSectionCollapsed(id: string): boolean {
    return this.collapsedSections().has(id);
  }

  onSectionCollapsedChange(id: string, collapsed: boolean): void {
    const next = new Set(this.collapsedSections());
    if (collapsed) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.collapsedSections.set(next);
  }

  toggleAllSections(): void {
    if (this.allSectionsCollapsed()) {
      this.collapsedSections.set(new Set());
    } else {
      this.collapsedSections.set(new Set(this.allSectionIds()));
    }
  }

  handleSectionClick(id: string): void {
    this.activeSection.set(id);
    if (this.isSectionCollapsed(id)) {
      this.onSectionCollapsedChange(id, false);
    }
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const top =
        el.getBoundingClientRect().top + window.scrollY - (5.5 * 16 + 42);
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  sectionStatus(type: PromptType): SectionStatus {
    if (this.isProcessing().get(type)) return 'processing';
    const r = this.results().get(type);
    if (!r) return undefined;
    return r.status === 'completed'
      ? 'completed'
      : r.status === 'failed'
        ? 'error'
        : 'pending';
  }

  private loadStoredOptimization(id: string): void {
    forkJoin({
      jobApplication: this.jobApplicationApiService.getJobApplication(id),
      results: this.cvOptimizationApiService.getOptimizationResults(id),
    })
      .pipe(
        switchMap(({ jobApplication, results }) => {
          this.jobApplicationId.set(id);
          this.jobApplication.set(jobApplication);
          console.log('results: ', results);

          const resultMap = new Map<PromptType, SseJobCompleteEvent>();
          for (const r of results) {
            if (r.status === 'COMPLETED' && r.structuredOutput != null) {
              resultMap.set(r.promptType, {
                promptType: r.promptType,
                status: 'completed',
                result: r.structuredOutput,
              });
            }
            if (r.promptType === PromptType.SUMMARY_REWRITE) {
              this.summaryRewriteResultId.set(r.id);
              if (r.userEditedOutput != null) {
                try {
                  const state = JSON.parse(
                    r.userEditedOutput,
                  ) as SummaryUserState;
                  this.selections.update((s) => ({
                    ...s,
                    selectedSummaryAngle: state.selectedSummaryAngle,
                    customSummaryText: state.customSummaryText,
                  }));
                } catch {
                  console.warn(
                    'Could not parse summary user state from stored optimization',
                  );
                }
              }
            }
            if (r.promptType === PromptType.BULLET_UPGRADE) {
              this.bulletUpgradeResultId.set(r.id);
              if (r.userEditedOutput != null) {
                try {
                  const state = JSON.parse(
                    r.userEditedOutput,
                  ) as BulletUserState;
                  const editsMap = new Map<string, string>();
                  for (const e of state.edits) {
                    editsMap.set(
                      `${e.company}|${e.title}|${e.originalText}`,
                      e.editedText,
                    );
                  }
                  this.bulletEdits.set(editsMap);
                  this.selections.update((s) => ({
                    ...s,
                    selectedBullets: state.selectedBullets,
                    selectedKeywords: state.selectedKeywords ?? [],
                  }));
                  this.selectedMissingBullets.set(
                    (state.selectedMissingBullets ?? []).map((s) => ({
                      forPosition: s.forPosition,
                      suggestedBullet: s.suggestedBullet,
                    })),
                  );
                  const missingEditsMap = new Map<string, string>();
                  for (const s of state.selectedMissingBullets ?? []) {
                    if (s.editedText !== undefined) {
                      missingEditsMap.set(
                        `${s.forPosition}|${s.suggestedBullet}`,
                        s.editedText,
                      );
                    }
                  }
                  this.missingBulletEdits.set(missingEditsMap);
                  this.removedBullets.set(state.removedBullets ?? []);
                  const keywordEditsMap = new Map<string, string>();
                  for (const e of state.keywordEdits ?? []) {
                    keywordEditsMap.set(e.originalKeyword, e.editedText);
                  }
                  this.keywordEdits.set(keywordEditsMap);
                  const kwBulletPosMap = new Map<string, number>();
                  for (const p of state.keywordBulletPositions ?? []) {
                    kwBulletPosMap.set(p.keyword, p.experienceIndex);
                  }
                  this.keywordBulletPositions.set(kwBulletPosMap);
                } catch {
                  console.warn(
                    'Could not parse bullet user state from stored optimization',
                  );
                }
              }
            }
            if (r.promptType === PromptType.COVER_LETTER) {
              this.coverLetterResultId.set(r.id);
              if (r.userEditedOutput != null) {
                try {
                  const state = JSON.parse(
                    r.userEditedOutput,
                  ) as CoverLetterUserState;
                  this.selectedCoverLetterVariant.set(state.selectedVariant);
                  this.editedCoverLetterContent.set(state.editedContent);
                } catch {
                  console.warn(
                    'Could not parse cover letter user state from stored optimization',
                  );
                }
              }
            }
          }
          this.results.set(resultMap);

          return this.cvOptimizationApiService.getStructuredData(
            jobApplication.cvDocumentId,
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.cvStructuredData.set(data);
        },
        error: (err) => {
          const message =
            err?.error?.message ??
            'Failed to load optimization. Please try again.';
          this.loadError.set(message);
        },
      });
  }

  runOptimization({ jobApplication, extractedData }: JobSubmittedData): void {
    this.results.set(new Map());
    this.isProcessing.set(new Map());
    this.initializedDefaults.set(false);
    this.selections.set({
      selectedSummaryAngle: null,
      customSummaryText: null,
      selectedBullets: [],
      selectedKeywords: [],
    });
    this.bulletEdits.set(new Map());
    this.bulletUpgradeResultId.set(null);
    this.summaryRewriteResultId.set(null);
    this.coverLetterResultId.set(null);
    this.selectedCoverLetterVariant.set(null);
    this.editedCoverLetterContent.set(null);
    this.activeBulletEditKey.set(null);
    this.editedBulletText.set('');
    this.selectedMissingBullets.set([]);
    this.missingBulletEdits.set(new Map());
    this.removedBullets.set([]);
    this.keywordEdits.set(new Map());
    this.activeKeywordEditKey.set(null);
    this.editedKeywordText.set('');
    this.keywordBulletPositions.set(new Map());
    this.jobApplicationId.set(jobApplication.id);
    this.submittedJobApplication.set(jobApplication);
    this.cvStructuredData.set(extractedData);

    posthog.capture('optimization_started');

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
          posthog.capture('optimization_job_complete_event', {
            event: event,
          });
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
      .retryFailedJob(jobApplicationId, promptType)
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
    this.persistSummarySubject.next();
  }

  onAngleReset(): void {
    this.selections.update((s) => ({
      ...s,
      selectedSummaryAngle: null,
      customSummaryText: null,
    }));
    this.persistSummarySubject.next();
  }

  onSummaryTextEdited(text: string | null): void {
    this.selections.update((s) => ({ ...s, customSummaryText: text }));
    this.persistSummarySubject.next();
  }

  onCoverLetterVariantSelected(hookType: CoverLetterHookType): void {
    this.selectedCoverLetterVariant.set(hookType);
    this.persistCoverLetterSubject.next();
  }

  onCoverLetterTextEdited(content: string): void {
    this.editedCoverLetterContent.set(content);
    this.persistCoverLetterSubject.next();
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
    this.persistSubject.next();
  }

  onKeywordToggled(keyword: string): void {
    this.selections.update((s) => {
      const selectedKeywords = s.selectedKeywords.includes(keyword)
        ? s.selectedKeywords.filter((k) => k !== keyword)
        : [...s.selectedKeywords, keyword];
      return { ...s, selectedKeywords };
    });
    this.persistBulletState();
  }

  onKeywordEditStarted(keyword: string): void {
    this.activeKeywordEditKey.set(keyword);
    if (this.keywordEdits().has(keyword)) {
      this.editedKeywordText.set(this.keywordEdits().get(keyword)!);
      return;
    }
    const entry = this.keywordGapResult()?.missingKeywords.find(
      (m) => m.keyword === keyword,
    );
    if (
      entry?.suggestedPlacement === 'experience_bullet' &&
      entry.recommendation
    ) {
      const match = entry.recommendation.match(/'([^']+)'/);
      this.editedKeywordText.set(match ? match[1] : keyword);
    } else {
      this.editedKeywordText.set(keyword);
    }
  }

  onKeywordEditTextChanged(text: string): void {
    this.editedKeywordText.set(text);
  }

  onKeywordEditCancelled(): void {
    this.activeKeywordEditKey.set(null);
    this.editedKeywordText.set('');
  }

  onKeywordEditSaved(event: { key: string; text: string }): void {
    const trimmed = event.text.trim();
    if (trimmed === '') return;
    this.keywordEdits.update((map) => {
      const next = new Map(map);
      if (trimmed === event.key) {
        next.delete(event.key);
      } else {
        next.set(event.key, trimmed);
      }
      return next;
    });
    this.activeKeywordEditKey.set(null);
    this.editedKeywordText.set('');
    this.persistBulletState();
  }

  onKeywordBulletPositionSelected(event: {
    keyword: string;
    experienceIndex: number | null;
  }): void {
    this.keywordBulletPositions.update((map) => {
      const next = new Map(map);
      if (event.experienceIndex === null) {
        next.delete(event.keyword);
      } else {
        next.set(event.keyword, event.experienceIndex);
      }
      return next;
    });
    this.persistBulletState();
  }

  onBulletEditStarted(key: string): void {
    this.activeBulletEditKey.set(key);
    const existing = this.bulletEdits().get(key);
    if (existing !== undefined) {
      this.editedBulletText.set(existing);
      return;
    }
    const [company, title, originalText] = key.split('|');
    const bulletResult = this.bulletUpgradeResult();
    const position = bulletResult?.positions.find(
      (p) => p.company === company && p.title === title,
    );
    const bulletItem = position?.bullets.find(
      (b) => b.originalText === originalText,
    );
    this.editedBulletText.set(bulletItem?.rewrittenText ?? '');
  }

  onBulletEditTextChanged(text: string): void {
    this.editedBulletText.set(text);
  }

  onBulletEditCancelled(): void {
    this.activeBulletEditKey.set(null);
    this.editedBulletText.set('');
  }

  onBulletEditSaved(event: { key: string; text: string }): void {
    const trimmed = event.text.trim();
    this.bulletEdits.update((map) => {
      const next = new Map(map);
      if (trimmed === '') {
        next.delete(event.key);
      } else {
        next.set(event.key, trimmed);
      }
      return next;
    });
    this.activeBulletEditKey.set(null);
    this.editedBulletText.set('');
    this.persistBulletState();
  }

  onMissingBulletToggled(key: {
    forPosition: string;
    suggestedBullet: string;
  }): void {
    this.selectedMissingBullets.update((list) => {
      const exists = list.some(
        (s) =>
          s.forPosition === key.forPosition &&
          s.suggestedBullet === key.suggestedBullet,
      );
      return exists
        ? list.filter(
            (s) =>
              !(
                s.forPosition === key.forPosition &&
                s.suggestedBullet === key.suggestedBullet
              ),
          )
        : [...list, key];
    });
    this.persistSubject.next();
  }

  onMissingBulletEditStarted(key: string): void {
    this.activeBulletEditKey.set(key);
    const existing = this.missingBulletEdits().get(key);
    if (existing !== undefined) {
      this.editedBulletText.set(existing);
      return;
    }
    const separatorIdx = key.indexOf('|');
    const forPosition = key.slice(0, separatorIdx);
    const suggestedBullet = key.slice(separatorIdx + 1);
    const suggestion =
      this.bulletUpgradeResult()?.missingBulletSuggestions.find(
        (s) =>
          s.forPosition === forPosition &&
          s.suggestedBullet === suggestedBullet,
      );
    this.editedBulletText.set(suggestion?.suggestedBullet ?? '');
  }

  onMissingBulletEditSaved(event: { key: string; text: string }): void {
    const trimmed = event.text.trim();
    this.missingBulletEdits.update((map) => {
      const next = new Map(map);
      if (trimmed === '') {
        next.delete(event.key);
      } else {
        next.set(event.key, trimmed);
      }
      return next;
    });
    this.activeBulletEditKey.set(null);
    this.editedBulletText.set('');
    this.persistBulletState();
  }

  onRemovedBulletToggled(key: BulletSelectionKey): void {
    this.removedBullets.update((list) => {
      const exists = list.some(
        (b) =>
          b.company === key.company &&
          b.title === key.title &&
          b.originalText === key.originalText,
      );
      return exists
        ? list.filter(
            (b) =>
              !(
                b.company === key.company &&
                b.title === key.title &&
                b.originalText === key.originalText
              ),
          )
        : [...list, key];
    });
    this.persistSubject.next();
  }

  private persistBulletState(): void {
    const jobApplicationId = this.jobApplicationId();
    if (jobApplicationId === null) return;

    const buildAndSave = (resultId: string) => {
      const editsMap = this.bulletEdits();
      const edits: Array<BulletEditKey & { editedText: string }> = [];
      for (const [key, editedText] of editsMap) {
        const parts = key.split('|');
        const company = parts[0];
        const title = parts[1];
        const originalText = parts.slice(2).join('|');
        edits.push({ company, title, originalText, editedText });
      }
      const selectedMissingBullets = this.selectedMissingBullets().map((s) => {
        const key = `${s.forPosition}|${s.suggestedBullet}`;
        const editedText = this.missingBulletEdits().get(key);
        return editedText !== undefined ? { ...s, editedText } : s;
      });
      const keywordEditsArr: Array<{
        originalKeyword: string;
        editedText: string;
      }> = [];
      for (const [originalKeyword, editedText] of this.keywordEdits()) {
        keywordEditsArr.push({ originalKeyword, editedText });
      }
      const keywordBulletPositionsArr: Array<{
        keyword: string;
        experienceIndex: number;
      }> = [];
      for (const [keyword, experienceIndex] of this.keywordBulletPositions()) {
        keywordBulletPositionsArr.push({ keyword, experienceIndex });
      }
      const state: BulletUserState = {
        edits,
        selectedBullets: this.selections().selectedBullets,
        selectedMissingBullets,
        removedBullets: this.removedBullets(),
        keywordEdits: keywordEditsArr,
        keywordBulletPositions: keywordBulletPositionsArr,
        selectedKeywords: this.selections().selectedKeywords,
      };
      this.cvOptimizationApiService
        .saveUserOutput(resultId, JSON.stringify(state))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Could not save changes',
              detail: 'Your edits are still applied locally.',
            });
          },
        });
    };

    const knownId = this.bulletUpgradeResultId();
    if (knownId !== null) {
      buildAndSave(knownId);
      return;
    }

    this.cvOptimizationApiService
      .getOptimizationResults(jobApplicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const bulletResult = results.find(
            (r) => r.promptType === PromptType.BULLET_UPGRADE,
          );
          if (bulletResult) {
            this.bulletUpgradeResultId.set(bulletResult.id);
            buildAndSave(bulletResult.id);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save changes',
            detail: 'Your edits are still applied locally.',
          });
        },
      });
  }

  private persistSummaryState(): void {
    const jobApplicationId = this.jobApplicationId();
    if (jobApplicationId === null) return;

    const buildAndSave = (resultId: string) => {
      const state: SummaryUserState = {
        selectedSummaryAngle: this.selections().selectedSummaryAngle,
        customSummaryText: this.selections().customSummaryText,
      };
      this.cvOptimizationApiService
        .saveUserOutput(resultId, JSON.stringify(state))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Could not save changes',
              detail: 'Your edits are still applied locally.',
            });
          },
        });
    };

    const knownId = this.summaryRewriteResultId();
    if (knownId !== null) {
      buildAndSave(knownId);
      return;
    }

    this.cvOptimizationApiService
      .getOptimizationResults(jobApplicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const summaryResult = results.find(
            (r) => r.promptType === PromptType.SUMMARY_REWRITE,
          );
          if (summaryResult) {
            this.summaryRewriteResultId.set(summaryResult.id);
            buildAndSave(summaryResult.id);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save changes',
            detail: 'Your edits are still applied locally.',
          });
        },
      });
  }

  private persistCoverLetterState(): void {
    const jobApplicationId = this.jobApplicationId();
    if (jobApplicationId === null) return;

    const buildAndSave = (resultId: string) => {
      const state: CoverLetterUserState = {
        selectedVariant: this.selectedCoverLetterVariant(),
        editedContent: this.editedCoverLetterContent(),
      };
      this.cvOptimizationApiService
        .saveUserOutput(resultId, JSON.stringify(state))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Could not save changes',
              detail: 'Your edits are still applied locally.',
            });
          },
        });
    };

    const knownId = this.coverLetterResultId();
    if (knownId !== null) {
      buildAndSave(knownId);
      return;
    }

    this.cvOptimizationApiService
      .getOptimizationResults(jobApplicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const coverLetterResult = results.find(
            (r) => r.promptType === PromptType.COVER_LETTER,
          );
          if (coverLetterResult) {
            this.coverLetterResultId.set(coverLetterResult.id);
            buildAndSave(coverLetterResult.id);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save changes',
            detail: 'Your edits are still applied locally.',
          });
        },
      });
  }

  openOriginalCv(): void {
    const cvId = this.jobApplication()?.cvDocument?.id;
    if (!cvId) return;
    this.cvApiService
      .downloadCv(cvId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ url }) => window.open(url, '_blank'));
  }

  exportCvAsPdf(): void {
    this.onBulletEditCancelled();
    const cv = this.mergedCv();
    if (!cv) return;
    this.isExportingPdf.set(true);
    posthog.capture('optimized_cv_exported', {
      page: 'cv_optimization',
      format: 'pdf',
      template: this.selectedTemplate(),
      accentColor: this.accentColor(),
    });
    this.cvExportService
      .exportToPdf(cv, this.selectedTemplate(), this.accentColor())
      .finally(() => {
        this.isExportingPdf.set(false);
      });
  }

  exportCvAsDocx(): void {
    this.onBulletEditCancelled();
    const cv = this.mergedCv();
    if (!cv) return;
    this.isExportingDocx.set(true);
    posthog.capture('optimized_cv_exported', {
      page: 'cv_optimization',
      format: 'docx',
      template: this.selectedTemplate(),
      accentColor: this.accentColor(),
    });
    this.cvExportService
      .exportToDocx(cv, this.selectedTemplate(), this.accentColor())
      .finally(() => {
        this.isExportingDocx.set(false);
      });
  }
}
