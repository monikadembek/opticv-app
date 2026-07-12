import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { DatePipe } from '@angular/common';
import { formatFileSize, getMimeLabel } from '../../../../shared/utils';

@Component({
  selector: 'app-cv-file-list',
  imports: [RouterLink, ButtonModule, TableModule, DatePipe],
  templateUrl: './cv-file-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class CvFileList {
  private readonly router = inject(Router);

  readonly cvFiles = input.required<CvDocumentListItem[]>();
  readonly isCvsLoading = input<boolean>(false);
  readonly cvsError = input<string | null>(null);

  readonly downloadCvFile = output<CvDocumentListItem>();
  readonly deleteCvFile = output<CvDocumentListItem>();
  readonly loadCvs = output<void>();

  readonly formatFileSize = formatFileSize;
  readonly getMimeLabel = getMimeLabel;

  loadUserCvs() {
    this.loadCvs.emit();
  }

  optimizeCv(file: CvDocumentListItem): void {
    this.router.navigate(['/cv-optimization'], {
      queryParams: { cvId: file.id },
    });
  }

  downloadCv(file: CvDocumentListItem): void {
    this.downloadCvFile.emit(file);
  }

  deleteCv(file: CvDocumentListItem): void {
    this.deleteCvFile.emit(file);
  }
}
