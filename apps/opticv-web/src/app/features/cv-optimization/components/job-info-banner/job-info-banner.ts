import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import type { JobApplicationWithCv } from '@opticv/datatypes';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-job-info-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextareaModule],
  templateUrl: './job-info-banner.html',
  styleUrl: './job-info-banner.css',
})
export class JobInfoBanner {
  readonly jobApplication = input.required<JobApplicationWithCv>();
  readonly openCv = output<void>();

  readonly showDescription = signal(false);
}
