import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-processing-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="processing-state">
      <div class="processing-info">
        <i class="pi pi-spin pi-spinner"></i>
        <span class="text-sm">Analyzing your resume…</span>
      </div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
  `,
  styleUrl: './processing-placeholder.css',
})
export class ProcessingPlaceholder {}
