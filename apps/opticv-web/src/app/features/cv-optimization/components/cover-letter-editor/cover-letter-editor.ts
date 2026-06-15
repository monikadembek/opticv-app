import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import type { CoverLetterResult } from '@opticv/datatypes';
import { CoverLetterExportService } from '../../services/cover-letter-export.service';

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
  imports: [FormsModule, EditorModule, ButtonModule, MessageModule],
})
export class CoverLetterEditor {
  private readonly exportService = inject(CoverLetterExportService);
  private readonly messageService = inject(MessageService);
  private userHasInteracted = false;

  readonly result = input.required<CoverLetterResult>();

  readonly safeIndex = computed<number>(() => {
    const idx = this.result().variants.findIndex(
      (v) => v.hookType === this.result().recommendedVariant,
    );
    return idx === -1 ? 0 : idx;
  });

  readonly selectedVariantIndex = signal<number>(0);
  readonly editorContent = signal<string>('');
  readonly isBusyPdf = signal(false);
  readonly isBusyDocx = signal(false);

  constructor() {
    effect(() => {
      const idx = this.safeIndex();
      this.selectedVariantIndex.set(idx);
      this.editorContent.set(this.buildContent(idx));
    });
  }

  onEditorInit({
    editor,
  }: {
    editor: { blur: () => void; root: HTMLElement };
  }): void {
    editor.root.addEventListener('mousedown', () => {
      this.userHasInteracted = true;
    });
    editor.root.addEventListener('focus', () => {
      if (!this.userHasInteracted) {
        editor.blur();
      }
    });
  }

  selectVariant(index: number): void {
    this.selectedVariantIndex.set(index);
    this.editorContent.set(this.buildContent(index));
  }

  async onExportPdf(): Promise<void> {
    this.isBusyPdf.set(true);
    try {
      await this.exportService.exportToPdf(this.editorContent());
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate the PDF. Please try again.',
      });
    } finally {
      this.isBusyPdf.set(false);
    }
  }

  async onExportDocx(): Promise<void> {
    this.isBusyDocx.set(true);
    try {
      await this.exportService.exportToDocx(this.editorContent());
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Export failed',
        detail: 'Could not generate the DOCX. Please try again.',
      });
    } finally {
      this.isBusyDocx.set(false);
    }
  }

  private buildContent(index: number): string {
    const { salutation, variants } = this.result();
    const fullLetter = variants[index].fullLetter;
    const text =
      salutation && !fullLetter.trimStart().startsWith(salutation)
        ? `${salutation}\n\n${fullLetter}`
        : fullLetter;
    return plainTextToHtml(text);
  }
}
