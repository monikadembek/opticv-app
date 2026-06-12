import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Supabase } from '../../core/auth/services/supabase';

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
  }

  signIn(): void {
    this.router.navigate(['login']);
  }
}
