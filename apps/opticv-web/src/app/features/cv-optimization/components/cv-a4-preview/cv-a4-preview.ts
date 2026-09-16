import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { CvStructuredData } from '@opticv/datatypes';
import { ProgressSpinner } from 'primeng/progressspinner';
import { CvTemplateId, DEFAULT_ACCENT_COLOR } from '../../cv-templates';
import { CvTemplatePreview } from '../cv-template-preview/cv-template-preview';

const A4_HEIGHT_PX = 1123;
const PAGE_MARGIN_PX = 32;
// PDF margins in px (matches 56pt left/right, 60pt top/bottom in cv-export.service.ts)
const CONTENT_MARGIN_PX = 60;
// Full clip window per page = A4 minus the page shell padding
const CLIP_HEIGHT_PX = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2;
// Usable content per page = clip window minus top + bottom content margins
const CONTENT_HEIGHT_PX = CLIP_HEIGHT_PX - CONTENT_MARGIN_PX * 2;

@Component({
  selector: 'app-cv-a4-preview',
  templateUrl: './cv-a4-preview.html',
  styleUrl: './cv-a4-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CvTemplatePreview, ProgressSpinner],
})
export class CvA4Preview implements AfterViewInit {
  readonly cv = input.required<CvStructuredData | null>();
  readonly templateId = input.required<CvTemplateId | null>();
  readonly accentColor = input<string>(DEFAULT_ACCENT_COLOR);

  readonly pages = signal<number[]>([]);
  readonly measuring = signal<boolean>(true);
  readonly CONTENT_HEIGHT_PX = CONTENT_HEIGHT_PX;

  private readonly hiddenContainer =
    viewChild.required<ElementRef<HTMLElement>>('hiddenContainer');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private observer: ResizeObserver | null = null;
  private pendingMeasure = false;

  constructor() {
    effect(() => {
      this.cv();
      this.templateId();
      this.accentColor();
      this.pendingMeasure = true;
      this.measuring.set(true);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.measuring.set(false);
      return;
    }

    this.observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect.height > 0 && this.pendingMeasure) {
        this.pendingMeasure = false;
        this.doMeasure();
      }
    });

    this.observer.observe(this.hiddenContainer().nativeElement);

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
    });
  }

  private doMeasure(): void {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        const el = this.hiddenContainer().nativeElement;
        const scrollHeight = el.scrollHeight;
        const cv = this.cv();

        if (cv === null) {
          this.pages.set([]);
        } else {
          // Each page shows exactly CONTENT_HEIGHT_PX of content.
          const count = Math.max(
            1,
            Math.ceil(scrollHeight / CONTENT_HEIGHT_PX),
          );
          this.pages.set(Array.from({ length: count }, (_, i) => i));
        }

        this.measuring.set(false);
      });
    });
  }
}
