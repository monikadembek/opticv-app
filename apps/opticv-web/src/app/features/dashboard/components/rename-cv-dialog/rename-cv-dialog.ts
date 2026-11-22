import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CV_NAME_MAX_LENGTH } from '@opticv/datatypes';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { cvNameValidator } from '../../../../shared/utils';

@Component({
  selector: 'app-rename-cv-dialog',
  imports: [DialogModule, ButtonModule, InputTextModule, ReactiveFormsModule],
  templateUrl: './rename-cv-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameCvDialog {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly visible = input(false);
  readonly cvName = input('');
  readonly saving = input(false);

  readonly save = output<string>();
  readonly dismiss = output<void>();

  readonly maxLength = CV_NAME_MAX_LENGTH;
  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [cvNameValidator],
  });

  private returnFocusTo: HTMLElement | null = null;
  private wasVisible = false;

  constructor() {
    effect(() => {
      const visible = this.visible();
      if (visible && !this.wasVisible) {
        untracked(() => this.onOpen());
      }
      this.wasVisible = visible;
    });
  }

  private onOpen(): void {
    this.nameControl.reset(this.cvName());
    if (isPlatformBrowser(this.platformId)) {
      const active = this.document.activeElement;
      this.returnFocusTo = active instanceof HTMLElement ? active : null;
    }
  }

  showError(): boolean {
    return (
      this.nameControl.invalid &&
      (this.nameControl.touched || this.nameControl.dirty)
    );
  }

  errorMessage(): string {
    return this.nameControl.hasError('maxlength')
      ? `Name must be ${CV_NAME_MAX_LENGTH} characters or fewer.`
      : 'Name is required.';
  }

  submit(): void {
    if (this.nameControl.invalid || this.saving()) {
      this.nameControl.markAsTouched();
      return;
    }
    this.save.emit(this.nameControl.value.trim());
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  cancel(): void {
    if (this.saving()) return;
    this.dismiss.emit();
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.cancel();
    }
  }

  onHide(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    if (target?.isConnected) {
      target.focus();
    }
  }
}
