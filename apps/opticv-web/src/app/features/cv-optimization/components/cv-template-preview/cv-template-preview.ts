import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CvStructuredData } from '@opticv/datatypes';
import { CvTemplateId } from '../../cv-templates';
import {
  AtsContactPipe,
  DateRangePipe,
  DegreeFieldPipe,
} from './cv-preview-pipes';

@Component({
  selector: 'app-cv-template-preview',
  templateUrl: './cv-template-preview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AtsContactPipe, DateRangePipe, DegreeFieldPipe],
})
export class CvTemplatePreview {
  readonly cv = input.required<CvStructuredData | null>();
  readonly templateId = input.required<CvTemplateId | null>();
}
