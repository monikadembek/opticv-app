import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { CvFileListItem } from '../cv-file-list-item/cv-file-list-item';

@Component({
  selector: 'app-cv-file-list',
  imports: [CvFileListItem],
  templateUrl: './cv-file-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvFileList {
  files = input.required<CvDocumentListItem[]>();
  download = output<CvDocumentListItem>();
  delete = output<CvDocumentListItem>();
}
