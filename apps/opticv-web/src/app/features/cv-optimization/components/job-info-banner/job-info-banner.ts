import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { JobApplicationWithCv } from '@opticv/datatypes';
import { TextareaModule } from 'primeng/textarea';
import { SectionCard } from '../section-card/section-card';

@Component({
  selector: 'app-job-info-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextareaModule, SectionCard],
  templateUrl: './job-info-banner.html',
  styleUrl: './job-info-banner.css',
})
export class JobInfoBanner {
  readonly jobApplication = input.required<JobApplicationWithCv>();
  readonly collapsed = model<boolean>(false);
  readonly openCv = output<void>();

  readonly showDescription = signal(false);
}
