import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PromptType } from '@opticv/datatypes';

export const NAV_GROUPS: {
  group: string;
  items: { id: PromptType | 'JOB_POSTING'; icon: string; label: string }[];
}[] = [
  {
    group: 'Job Posting',
    items: [
      {
        id: 'JOB_POSTING',
        icon: 'pi-folder',
        label: 'Job Posting and CV',
      },
    ],
  },
  {
    group: 'Resume Analysis',
    items: [
      {
        id: PromptType.RESUME_AUTOPSY,
        icon: 'pi-chart-bar',
        label: 'ATS Analysis',
      },
      { id: PromptType.KEYWORD_GAP, icon: 'pi-key', label: 'Keyword Gap' },
      {
        id: PromptType.SUMMARY_REWRITE,
        icon: 'pi-pen-to-square',
        label: 'Summary Rewrite',
      },
      {
        id: PromptType.BULLET_UPGRADE,
        icon: 'pi-list-check',
        label: 'Bullet Upgrades',
      },
    ],
  },
  {
    group: 'Additional Materials',
    items: [
      {
        id: PromptType.COVER_LETTER,
        icon: 'pi-file-edit',
        label: 'Cover Letter',
      },
      {
        id: PromptType.INTERVIEW_PREP,
        icon: 'pi-comments',
        label: 'Interview Prep',
      },
      {
        id: PromptType.LINKEDIN_REWRITE,
        icon: 'pi-link',
        label: 'LinkedIn Updates',
      },
    ],
  },
];

@Component({
  selector: 'app-optim-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './optim-sidebar.html',
  styleUrl: './optim-sidebar.css',
  host: {
    '[class.collapsed]': '!expanded()',
  },
})
export class OptimSidebar {
  readonly activeSection = input<string>(PromptType.RESUME_AUTOPSY);
  readonly statuses = input<Map<PromptType | 'JOB_POSTING', string>>(new Map());
  readonly processingSet = input<Set<PromptType | 'JOB_POSTING'>>(new Set());
  readonly expanded = input<boolean>(true);
  readonly atsScore = input<number | null>(null);
  readonly keywordScore = input<number | null>(null);
  readonly pageState = input<'initial' | 'processing' | 'completed'>('initial');

  readonly sectionClicked = output<string>();
  readonly toggleClicked = output<void>();

  readonly navGroups = NAV_GROUPS;

  readonly showScores = computed(
    () =>
      this.pageState() !== 'initial' &&
      this.expanded() &&
      this.atsScore() !== null,
  );

  scoreCircumference(radius: number): number {
    return 2 * Math.PI * radius;
  }

  scoreDash(score: number | null, radius: number): number {
    const pct = (score ?? 0) / 100;
    return pct * this.scoreCircumference(radius);
  }

  strokeColor(score: number | null): string {
    const value = score ?? 0;
    if (value <= 49) return '#ef4444';
    if (value <= 74) return '#f59e0b';
    return '#22c55e';
  }
}
