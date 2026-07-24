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
import { Router, RouterLink } from '@angular/router';
import posthog from 'posthog-js';

@Component({
  selector: 'app-verify',
  imports: [
    InputOtpModule,
    FormsModule,
    ButtonModule,
    MessageModule,
    RouterLink,
  ],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verify implements OnInit {
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  code = '';
  readonly isEmailPending = computed(() => !!this.supabase.pendingEmail());

  ngOnInit(): void {
    if (!this.isEmailPending()) {
      this.router.navigate(['/login']);
    }
  }

  async onSubmit(form: NgForm) {
    this.errorMessage.set('');

    const { code } = form.form.value;

    if (form.valid) {
      this.isSubmitting.set(true);
      posthog.capture('supabase_verifyotp_executed', { page: 'verify' });
      const {
        data: { session },
        error,
      } = await this.supabase.verifyOtp(
        code,
        this.supabase.pendingEmail() as string,
      );
      if (session) {
        console.log('verifyOtp data: ', session);
        this.supabase.setPendingEmail(null);
        form.resetForm();
        this.router.navigate(['']);
      }
      if (error) {
        console.log(error);
        this.errorMessage.set('Error during sign in process');
        this.isSubmitting.set(false);
      }
    }
  }
}
