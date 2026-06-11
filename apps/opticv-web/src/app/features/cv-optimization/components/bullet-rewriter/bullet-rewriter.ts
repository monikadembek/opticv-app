import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type {
  BulletSelectionKey,
  BulletUpgradeResult,
} from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

type MissingBulletKey = { forPosition: string; suggestedBullet: string };

@Component({
  imports: [ButtonModule, TextareaModule],
  selector: 'app-bullet-rewriter',
  templateUrl: './bullet-rewriter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulletRewriter {
  readonly result = input.required<BulletUpgradeResult>();
  readonly selectedBullets = input<BulletSelectionKey[]>([]);
  readonly bulletEdits = input<Map<string, string>>(new Map());
  readonly activeBulletEditKey = input<string | null>(null);
  readonly editedBulletText = input<string>('');
  readonly selectedMissingBullets = input<MissingBulletKey[]>([]);
  readonly missingBulletEdits = input<Map<string, string>>(new Map());
  readonly removedBullets = input<BulletSelectionKey[]>([]);

  readonly bulletToggled = output<BulletSelectionKey>();
  readonly editStarted = output<string>();
  readonly editSaved = output<{ key: string; text: string }>();
  readonly editCancelled = output<void>();
  readonly editTextChanged = output<string>();
  readonly missingBulletToggled = output<MissingBulletKey>();
  readonly missingBulletEditStarted = output<string>();
  readonly missingBulletEditSaved = output<{ key: string; text: string }>();
  readonly removedBulletToggled = output<BulletSelectionKey>();

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

  bulletKey(company: string, title: string, originalText: string): string {
    return `${company}|${title}|${originalText}`;
  }

  getDisplayText(
    company: string,
    title: string,
    originalText: string,
    aiText: string,
  ): string {
    return (
      this.bulletEdits().get(this.bulletKey(company, title, originalText)) ??
      aiText
    );
  }

  isEditing(company: string, title: string, originalText: string): boolean {
    return (
      this.activeBulletEditKey() ===
      this.bulletKey(company, title, originalText)
    );
  }

  isEdited(company: string, title: string, originalText: string): boolean {
    return this.bulletEdits().has(this.bulletKey(company, title, originalText));
  }

  missingBulletKey(forPosition: string, suggestedBullet: string): string {
    return `${forPosition}|${suggestedBullet}`;
  }

  isMissingSelected(forPosition: string, suggestedBullet: string): boolean {
    return this.selectedMissingBullets().some(
      (s) =>
        s.forPosition === forPosition && s.suggestedBullet === suggestedBullet,
    );
  }

  isMissingEdited(forPosition: string, suggestedBullet: string): boolean {
    return this.missingBulletEdits().has(
      this.missingBulletKey(forPosition, suggestedBullet),
    );
  }

  isMissingEditing(forPosition: string, suggestedBullet: string): boolean {
    return (
      this.activeBulletEditKey() ===
      this.missingBulletKey(forPosition, suggestedBullet)
    );
  }

  getMissingDisplayText(forPosition: string, suggestedBullet: string): string {
    return (
      this.missingBulletEdits().get(
        this.missingBulletKey(forPosition, suggestedBullet),
      ) ?? suggestedBullet
    );
  }

  isRemovedBullet(
    company: string,
    title: string,
    originalText: string,
  ): boolean {
    return this.removedBullets().some(
      (b) =>
        b.company === company &&
        b.title === title &&
        b.originalText === originalText,
    );
  }
}
