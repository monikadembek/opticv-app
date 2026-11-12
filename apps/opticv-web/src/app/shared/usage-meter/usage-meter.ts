import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { isNearLimit, usagePercent } from '../utils';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-usage-meter',
  imports: [DatePipe, RouterLink, ProgressBarModule, ButtonModule],
  template: `
    <div class="flex flex-col gap-2 text-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span class="font-semibold">{{ summary() }}</span>
          @if (atLimit()) {
            <span class="text-(--critical) font-semibold ml-4"
              >Limit reached</span
            >
          }
        </span>
        <span class="flex items-center gap-3">
          @if (resetsAt(); as date) {
            <span class="text-surface-500">
              {{ resetLabel() }} {{ date | date: 'mediumDate' }}
            </span>
          }
          @if (showUpgrade()) {
            <button
              pButton
              severity="primary"
              size="small"
              routerLink="/pricing"
              class="font-medium"
              (click)="upgradeClicked.emit()"
            >
              Upgrade
            </button>
          }
        </span>
      </div>
      <p-progressbar
        [value]="percent()"
        [showValue]="false"
        [attr.aria-label]="summary()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsageMeter {
  readonly label = input.required<string>();
  readonly used = input.required<number>();
  readonly limit = input.required<number>();
  readonly resetLabel = input<string | null>(null);
  readonly resetsAt = input<string | null>(null);
  readonly canUpgrade = input(true);

  readonly upgradeClicked = output<void>();

  readonly summary = computed(
    () => `${this.used()} of ${this.limit()} ${this.label()}`,
  );
  readonly percent = computed(() => usagePercent(this.used(), this.limit()));
  readonly atLimit = computed(
    () => this.limit() > 0 && this.used() >= this.limit(),
  );
  readonly showUpgrade = computed(
    () => this.canUpgrade() && isNearLimit(this.used(), this.limit()),
  );
}
