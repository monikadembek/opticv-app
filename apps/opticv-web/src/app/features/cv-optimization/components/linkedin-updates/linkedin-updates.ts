import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import type {
  LinkedInRewriteResult,
  RecommendedSkill,
} from '@opticv/datatypes';
import {
  LINKEDIN_ANGLE_LABELS,
  LINKEDIN_SECTION_LABELS,
  LinkedInExportService,
} from '../../services/linkedin-export.service';
import posthog from 'posthog-js';

@Component({
  selector: 'app-linkedin-updates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './linkedin-updates.html',
  imports: [PanelModule, Button],
})
export class LinkedInUpdates {
  readonly result = input.required<LinkedInRewriteResult>();

  protected readonly angleLabels = LINKEDIN_ANGLE_LABELS;
  protected readonly sectionLabels = LINKEDIN_SECTION_LABELS;

  protected readonly isBusyPdf = signal(false);
  protected readonly isBusyDocx = signal(false);

  private readonly exportService = inject(LinkedInExportService);
  private readonly messageService = inject(MessageService);

  protected readonly sortedRecommendations = computed(() => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...this.result().additionalRecommendations].sort(
      (a, b) => order[a.priority] - order[b.priority],
    );
  });

  protected readonly recommendedSkills = computed<RecommendedSkill[]>(
    () => this.result().recommendedSkills?.slice(0, 50) ?? [],
  );

  protected readonly hasSkills = computed(
    () => this.recommendedSkills().length > 0,
  );

  protected readonly skillsCount = computed(
    () => this.recommendedSkills().length,
  );

  async onExportPdf(): Promise<void> {
    this.isBusyPdf.set(true);
    try {
      await this.exportService.exportToPdf(this.result());
      posthog.capture('linkedin_content_exported', {
        page: 'cv_optimization',
        format: 'pdf',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate PDF with LinkedIn profile information.',
      });
    } finally {
      this.isBusyPdf.set(false);
    }
  }

  async onExportDocx(): Promise<void> {
    this.isBusyDocx.set(true);
    try {
      await this.exportService.exportToDocx(this.result());
      posthog.capture('linkedin_content_exported', {
        page: 'cv_optimization',
        format: 'docx',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate DOCX with LinkedIn profile information.',
      });
    } finally {
      this.isBusyDocx.set(false);
    }
  }

  protected priorityClass(priority: 'high' | 'medium' | 'low'): string {
    return {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-gray-500',
    }[priority];
  }

  protected charCountClass(count: number, max: number): string {
    const ratio = count / max;
    if (ratio > 1) return 'text-red-600';
    if (ratio > 0.9) return 'text-amber-500';
    return 'text-gray-500';
  }

  protected copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {
      this.messageService.add({
        severity: 'warn',
        summary: 'Copy failed',
        detail: 'Could not copy text to clipboard.',
      });
    });
  }

  protected copyAllSkills(): void {
    this.copyToClipboard(
      this.recommendedSkills()
        .map((s) => s.name)
        .join(', '),
    );
  }
}
