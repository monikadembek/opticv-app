import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Supabase } from '../../services/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    MessageModule,
    ToastModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    FormsModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly messageService = inject(MessageService);
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);

  email = '';
  readonly errorMessage = signal('');

  async onSubmit(loginForm: NgForm) {
    this.errorMessage.set('');
    const { email } = loginForm.form.value;

    if (loginForm.valid && email.length > 0) {
      const { data, error } = await this.supabase.signInWithOtp(email);
      if (!error) {
        console.log('data', data);
        this.messageService.add({
          severity: 'success',
          summary: 'Login',
          detail: 'Check your email for the OTP code',
          life: 3000,
        });
        this.supabase.setPendingEmail(email);
        this.router.navigate(['/verify']);
      }
      if (error) {
        console.log(error);
        this.errorMessage.set('Error during sign in process');
      }
    }
  }
}
