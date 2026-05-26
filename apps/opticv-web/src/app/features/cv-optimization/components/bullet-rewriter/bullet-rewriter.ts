import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { BulletSelectionKey, BulletUpgradeResult } from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

@Component({
  imports: [ButtonModule, TextareaModule],
  selector: 'app-bullet-rewriter',
  templateUrl: './bullet-rewriter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulletRewriter {
  readonly result = input.required<BulletUpgradeResult>();
  readonly selectedBullets = input<BulletSelectionKey[]>([]);

  readonly bulletToggled = output<BulletSelectionKey>();

  isSelected(company: string, title: string, originalText: string): boolean {
    return this.selectedBullets().some(
      (b) =>
        b.company === company &&
        b.title === title &&
        b.originalText === originalText,
    );
  }

  toggleBullet(company: string, title: string, originalText: string): void {
    this.bulletToggled.emit({ company, title, originalText });
  }
}
