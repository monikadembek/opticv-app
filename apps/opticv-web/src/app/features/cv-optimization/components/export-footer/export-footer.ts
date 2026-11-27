import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  CvTemplateId,
  CV_TEMPLATES,
  DEFAULT_ACCENT_COLOR,
} from '../../cv-templates';
import { CvA4Preview } from '../cv-a4-preview/cv-a4-preview';
import { CvExportDialog } from '../cv-export-dialog/cv-export-dialog';
import type { CvStructuredData } from '@opticv/datatypes';

@Component({
  selector: 'app-export-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, DialogModule, CvA4Preview, CvExportDialog],
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
  readonly exportDialogVisible = signal(false);
}
