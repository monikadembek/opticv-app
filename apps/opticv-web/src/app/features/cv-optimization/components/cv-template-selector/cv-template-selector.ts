import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  signal,
  viewChildren,
} from '@angular/core';
import type { CvStructuredData } from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  ACCENT_AWARE_TEMPLATE_IDS,
  CV_TEMPLATES,
  CvTemplate,
  CvTemplateId,
  DEFAULT_ACCENT_COLOR,
} from '../../cv-templates';
import { CvTemplatePreview } from '../cv-template-preview/cv-template-preview';

@Component({
  selector: 'app-cv-template-selector',
  templateUrl: './cv-template-selector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, DialogModule, CvTemplatePreview],
  host: {
    role: 'radiogroup',
    'aria-label': 'Choose CV template',
  },
})
export class CvTemplateSelector {
  readonly selected = model<CvTemplateId>('default');
  readonly mergedCv = input.required<CvStructuredData | null>();
  readonly accentColor = input<string>(DEFAULT_ACCENT_COLOR);

  readonly templates: CvTemplate[] = CV_TEMPLATES;

  readonly previewTemplateId = signal<CvTemplateId | null>(null);
  readonly previewVisible = signal(false);

  private templateCards = viewChildren<ElementRef<HTMLElement>>('templateCard');

  select(id: CvTemplateId): void {
    this.selected.set(id);
  }

  openPreview(id: CvTemplateId, event: Event): void {
    event.stopPropagation();
    this.previewTemplateId.set(id);
    this.previewVisible.set(true);
  }

  closePreview(): void {
    this.previewVisible.set(false);
  }

  templateName(id: CvTemplateId | null): string {
    return this.templates.find((t) => t.id === id)?.name ?? '';
  }

  thumbnailColor(id: CvTemplateId): string {
    return ACCENT_AWARE_TEMPLATE_IDS.includes(id)
      ? this.accentColor()
      : '#94a3b8';
  }

  onKeydown(event: KeyboardEvent, id: CvTemplateId): void {
    const ids = this.templates.map((t) => t.id);
    const idx = ids.indexOf(id);

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = ids[(idx + 1) % ids.length];
      this.selected.set(next);
      this.focusCard(next);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = ids[(idx - 1 + ids.length) % ids.length];
      this.selected.set(prev);
      this.focusCard(prev);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.selected.set(id);
    }
  }

  private focusCard(id: CvTemplateId): void {
    const card = this.templateCards().find(
      (ref) => ref.nativeElement.dataset['templateId'] === id,
    );
    card?.nativeElement.focus();
  }
}
