import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CvTemplateId, CV_TEMPLATES } from '../../cv-templates';
import { CvTemplatePreview } from '../cv-template-preview/cv-template-preview';
import type { CvStructuredData } from '@opticv/datatypes';

@Component({
  selector: 'app-export-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, DialogModule, FormsModule, CvTemplatePreview],
  templateUrl: './export-footer.html',
  styleUrl: './export-footer.css',
})
export class ExportFooter {
  readonly sidebarExpanded = input<boolean>(true);
  readonly selectedTemplate = model<CvTemplateId>('ats');
  readonly isExportingPdf = input<boolean>(false);
  readonly isExportingDocx = input<boolean>(false);
  readonly mergedCv = input<CvStructuredData | null>(null);

  readonly exportPdf = output<void>();
  readonly exportDocx = output<void>();

  readonly previewVisible = signal(false);
  readonly templates = CV_TEMPLATES;
}
