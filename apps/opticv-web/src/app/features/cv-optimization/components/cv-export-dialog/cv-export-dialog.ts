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
  ACCENT_AWARE_TEMPLATE_IDS,
  CV_ACCENT_COLORS,
  CV_TEMPLATES,
  CvTemplateId,
  DEFAULT_ACCENT_COLOR,
} from '../../cv-templates';

@Component({
  selector: 'app-cv-export-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, DialogModule, FormsModule, Select],
  templateUrl: './cv-export-dialog.html',
  styleUrl: './cv-export-dialog.css',
})
export class CvExportDialog {
  readonly visible = model<boolean>(false);
  readonly selectedTemplate = model<CvTemplateId>('default');
  readonly accentColor = model<string>(DEFAULT_ACCENT_COLOR);
  readonly includeGdprClause = model<boolean>(false);
  readonly showCompliance = input<boolean>(true);
  readonly allowedTemplateIds = input<CvTemplateId[]>(
    CV_TEMPLATES.map((t) => t.id),
  );
  readonly isExportingPdf = input<boolean>(false);
  readonly isExportingDocx = input<boolean>(false);

  readonly exportPdf = output<void>();
  readonly exportDocx = output<void>();

  readonly infoDialogVisible = signal(false);
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
