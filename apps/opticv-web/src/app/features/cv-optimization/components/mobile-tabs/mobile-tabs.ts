import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { PromptType } from '@opticv/datatypes';
import { NAV_GROUPS } from '../optim-sidebar/optim-sidebar';

@Component({
  selector: 'app-mobile-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-tabs.html',
  styleUrl: './mobile-tabs.css',
})
export class MobileTabs {
  readonly activeSection = input<string>(PromptType.RESUME_AUTOPSY);
  readonly statuses = input<Map<PromptType, string>>(new Map());

  readonly sectionClicked = output<string>();

  readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  readonly navItems = NAV_GROUPS.flatMap((g) => g.items);

  constructor() {
    effect(() => {
      const active = this.activeSection();
      const buttons = this.tabButtons();
      const idx = this.navItems.findIndex((i) => i.id === active);
      if (idx >= 0 && buttons[idx]) {
        const el = buttons[idx].nativeElement;
        el.scrollIntoView?.({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    });
  }
}
