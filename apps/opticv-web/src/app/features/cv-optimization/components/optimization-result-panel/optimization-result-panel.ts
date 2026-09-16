import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-optimization-result-panel',
  templateUrl: './optimization-result-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptimizationResultPanel {
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly hasData = input.required<boolean>();
}
