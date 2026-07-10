import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { formatFileSize, getMimeLabel } from '../../../../shared/utils';

@Component({
  selector: 'app-cv-file-list-item',
  imports: [ButtonModule, DatePipe],
  templateUrl: './cv-file-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvFileListItem {
  file = input.required<CvDocumentListItem>();
  optimize = output<CvDocumentListItem>();
  download = output<CvDocumentListItem>();
  delete = output<CvDocumentListItem>();

  readonly formatFileSize = formatFileSize;
  readonly getMimeLabel = getMimeLabel;

  onOptimize(): void {
    this.optimize.emit(this.file());
  }

  onDownload(): void {
    this.download.emit(this.file());
  }

  onDelete(): void {
    this.delete.emit(this.file());
  }
}
