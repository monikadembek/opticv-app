import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProcessingPlaceholder } from '../processing-placeholder/processing-placeholder';
import { SectionStatus } from '../../models';

@Component({
  selector: 'app-section-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProcessingPlaceholder, ButtonModule, DialogModule],
  templateUrl: './section-card.html',
  styleUrl: './section-card.css',
})
export class SectionCard {
  readonly sectionId = input.required<string>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly status = input<SectionStatus>(undefined);
  readonly collapsed = model<boolean>(false);
  readonly helpTitle = input<string>();

  readonly helpDialogVisible = signal(false);

  toggleCollapsed(): void {
    this.collapsed.update((c) => !c);
  }
}
