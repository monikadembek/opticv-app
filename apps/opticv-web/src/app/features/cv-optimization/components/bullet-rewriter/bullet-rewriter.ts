import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BulletUpgradeResult } from '@opticv/datatypes';

@Component({
  selector: 'app-bullet-rewriter',
  templateUrl: './bullet-rewriter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulletRewriter {
  readonly result = input.required<BulletUpgradeResult>();
}
