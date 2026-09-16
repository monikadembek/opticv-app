import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import {
  CvTemplateId,
  CV_ACCENT_COLORS,
  CV_TEMPLATES,
  DEFAULT_ACCENT_COLOR,
  ACCENT_AWARE_TEMPLATE_IDS,
} from '../../cv-templates';
import { CvA4Preview } from '../cv-a4-preview/cv-a4-preview';
import type { CvStructuredData } from '@opticv/datatypes';

@Component({
  selector: 'app-export-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, DialogModule, FormsModule, Select, CvA4Preview],
  templateUrl: './export-footer.html',
  styleUrl: './export-footer.css',
})
export class ExportFooter {
  readonly sidebarExpanded = input<boolean>(true);
  readonly selectedTemplate = model<CvTemplateId>('default');
  readonly accentColor = model<string>(DEFAULT_ACCENT_COLOR);
  readonly includeGdprClause = model<boolean>(false);
  readonly isExportingPdf = input<boolean>(false);
  readonly isExportingDocx = input<boolean>(false);
  readonly mergedCv = input<CvStructuredData | null>(null);
  readonly allowedTemplateIds = input<CvTemplateId[]>(
    CV_TEMPLATES.map((t) => t.id),
  );

  readonly exportPdf = output<void>();
  readonly exportDocx = output<void>();

  readonly previewVisible = signal(false);
  readonly infoDialogVisible = signal(false);
  readonly exportDialogVisible = signal(false);
  readonly accentColors = CV_ACCENT_COLORS;

  readonly templates = computed(() =>
    CV_TEMPLATES.map((template) => ({
      ...template,
      disabled: !this.allowedTemplateIds().includes(template.id),
      name: this.allowedTemplateIds().includes(template.id)
        ? template.name
        : `${template.name} (Upgrade to unlock)`,
    })),
  );

  readonly accentColorDisabled = computed(
    () => !ACCENT_AWARE_TEMPLATE_IDS.includes(this.selectedTemplate()),
  );
}
