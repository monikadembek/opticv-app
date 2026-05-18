import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { JobUpload } from './components/job-upload/job-upload';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-cv-optimization-page',
  imports: [JobUpload, StepperModule, ButtonModule],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {}
