import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { CvOptimizationStep1 } from './components/cv-optimization-step1/cv-optimization-step1';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-cv-optimization-page',
  imports: [CvOptimizationStep1, StepperModule, ButtonModule],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {}
