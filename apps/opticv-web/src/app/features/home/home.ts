import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Supabase } from '../../core/auth/services/supabase';
import posthog from 'posthog-js';

@Component({
  selector: 'app-home',
  imports: [ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private router = inject(Router);
  private supabaseService = inject(Supabase);

  isUserLoggedIn = computed(() =>
    this.supabaseService.currentSession() ? true : false,
  );

  goToCreator(): void {
    this.router.navigate(['cv-optimization']);
    posthog.capture('optimize_my_cv_button_clicked', {
      page: 'Home',
      button_name: 'Optimize my CV',
    });
  }

  signIn(): void {
    this.router.navigate(['login']);
  }
}
