import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Supabase } from '../../services/supabase';
import { FormsModule, NgForm } from '@angular/forms';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import posthog from 'posthog-js';
import { CvStore } from '../../../stores/cv.store';

@Component({
  selector: 'app-verify-email-change',
  imports: [InputOtpModule, FormsModule, ButtonModule, MessageModule],
  templateUrl: './verify-email-change.html',
  styleUrl: './verify-email-change.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailChange implements OnInit {
  protected readonly supabase = inject(Supabase);
  private readonly router = inject(Router);
  private readonly cvStore = inject(CvStore);

  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  code = '';
  readonly isEmailChangePending = computed(
    () => !!this.supabase.pendingEmailChange(),
  );

  ngOnInit(): void {
    if (!this.isEmailChangePending()) {
      this.router.navigate(['/settings']);
    }
  }

  async onSubmit(form: NgForm) {
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    const { code } = form.form.value;

    if (form.valid) {
      posthog.capture('email_change_verifyotp_executed', {
        page: 'verify-email-change',
      });
      const {
        data: { session },
        error,
      } = await this.supabase.verifyEmailChange(
        code,
        this.supabase.pendingEmailChange() as string,
      );
      if (session) {
        this.supabase.setPendingEmailChange(null);
        await this.supabase.signOut();
        this.cvStore.resetStore();
        this.router.navigate(['/login']);
      }
      if (error) {
        this.errorMessage.set('Invalid or expired code. Please try again.');
        this.isSubmitting.set(false);
      }
    }
  }
}
