import { ChangeDetectionStrategy, Component } from '@angular/core';
import { JobUpload } from './components/job-upload/job-upload';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-cv-optimization-page',
  imports: [JobUpload, AccordionModule, ButtonModule],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {}
