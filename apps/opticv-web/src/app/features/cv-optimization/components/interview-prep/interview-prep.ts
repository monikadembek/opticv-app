import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { MessageModule } from 'primeng/message';
import type {
  InterviewPrepQuestion,
  InterviewPrepResult,
} from '@opticv/datatypes';

@Component({
  selector: 'app-interview-prep',
  templateUrl: './interview-prep.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelModule, MessageModule],
})
export class InterviewPrep {
  readonly result = input.required<InterviewPrepResult>();

  categoryClass(category: InterviewPrepQuestion['category']): string {
    const map: Record<InterviewPrepQuestion['category'], string> = {
      behavioral: 'bg-blue-100 text-blue-800',
      technical: 'bg-purple-100 text-purple-800',
      situational: 'bg-green-100 text-green-800',
      fit: 'bg-orange-100 text-orange-800',
      candidate_specific: 'bg-pink-100 text-pink-800',
      leadership: 'bg-indigo-100 text-indigo-800',
      culture: 'bg-teal-100 text-teal-800',
    };
    return map[category];
  }

  likelihoodClass(
    likelihood: NonNullable<InterviewPrepQuestion['likelihood']>,
  ): string {
    const map: Record<
      NonNullable<InterviewPrepQuestion['likelihood']>,
      string
    > = {
      very_high: 'bg-red-100 text-red-700',
      high: 'bg-amber-100 text-amber-700',
      medium: 'bg-surface-100 text-surface-500',
    };
    return map[likelihood];
  }
}
