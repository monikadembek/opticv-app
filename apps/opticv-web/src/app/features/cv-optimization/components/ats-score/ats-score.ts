import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type {
  ResumeAutopsyIssue,
  ResumeAutopsyResult,
} from '@opticv/datatypes';

interface RingData {
  label: string;
  score: number;
  isEstimate: boolean;
}

const SEVERITY_ORDER: ResumeAutopsyIssue['severity'][] = [
  'critical',
  'high',
  'medium',
  'low',
];

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

export interface IssueGroup {
  severity: ResumeAutopsyIssue['severity'];
  issues: ResumeAutopsyIssue[];
}

function groupAndSortIssues(issues: ResumeAutopsyIssue[]): IssueGroup[] {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    issues: issues.filter((i) => i.severity === severity),
  })).filter((g) => g.issues.length > 0);
}

@Component({
  selector: 'app-ats-score',
  templateUrl: './ats-score.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtsScore {
  readonly data = input.required<ResumeAutopsyResult>();
  readonly projectedScore = input<number | null>(null);

  readonly ringCircumference = RING_CIRCUMFERENCE;

  readonly secondRing = computed<RingData>(() => {
    const ps = this.projectedScore();
    return ps !== null
      ? { label: 'Estimated score', score: ps, isEstimate: true }
      : {
          label: 'After Fixes',
          score: this.data().predictedScoreAfterFixes,
          isEstimate: false,
        };
  });

  readonly issuesBySeverity = computed(() =>
    groupAndSortIssues(this.data().issues),
  );

  readonly expandedIssueIds = signal<Set<string>>(new Set());
  readonly collapsedGroups = signal<Set<string>>(new Set());

  toggleIssue(id: string): void {
    this.expandedIssueIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isIssueExpanded(id: string): boolean {
    return this.expandedIssueIds().has(id);
  }

  scoreColorClass(score: number): string {
    if (score <= 49) return 'text-red-500';
    if (score <= 74) return 'text-amber-500';
    return 'text-green-500';
  }

  strokeColor(score: number): string {
    if (score <= 49) return '#ef4444';
    if (score <= 74) return '#f59e0b';
    return '#22c55e';
  }

  strokeDashoffset(score: number): number {
    return RING_CIRCUMFERENCE * (1 - score / 100);
  }
}
