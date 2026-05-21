import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import type { CoverLetterResult } from '@opticv/datatypes';

function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

@Component({
  selector: 'app-cover-letter-editor',
  templateUrl: './cover-letter-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    EditorModule,
    ButtonModule,
    TooltipModule,
    MessageModule,
  ],
})
export class CoverLetterEditor {
  readonly result = input.required<CoverLetterResult>();

  readonly safeIndex = computed<number>(() => {
    const idx = this.result().variants.findIndex(
      (v) => v.hookType === this.result().recommendedVariant,
    );
    return idx === -1 ? 0 : idx;
  });

  readonly selectedVariantIndex = signal<number>(0);
  readonly editorContent = signal<string>('');

  constructor() {
    effect(() => {
      const idx = this.safeIndex();
      this.selectedVariantIndex.set(idx);
      this.editorContent.set(this.buildContent(idx));
    });
  }

  selectVariant(index: number): void {
    this.selectedVariantIndex.set(index);
    this.editorContent.set(this.buildContent(index));
  }

  private buildContent(index: number): string {
    const { salutation, variants } = this.result();
    const text = salutation
      ? `${salutation}\n\n${variants[index].fullLetter}`
      : variants[index].fullLetter;
    return plainTextToHtml(text);
  }
}
