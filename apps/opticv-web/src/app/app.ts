import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TopHeader } from './layout/top-header/top-header';
import { Footer } from './layout/footer/footer';
import { Supabase } from './core/auth/services/supabase';
import { ToastModule } from 'primeng/toast';
import { PosthogService } from './core/services/posthog.service';
import { CvStore } from './core/stores/cv.store';
import { UserGuideStore } from './core/stores/user-guide.store';
import { WelcomeGuideModal } from './shared/welcome-guide-modal/welcome-guide-modal';
import posthog from 'posthog-js';

@Component({
  imports: [RouterModule, TopHeader, Footer, ToastModule, WelcomeGuideModal],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly supabaseService = inject(Supabase);
  private readonly router = inject(Router);
  readonly _posthog = inject(PosthogService);
  readonly cvStore = inject(CvStore);
  readonly userGuideStore = inject(UserGuideStore);

  isUserLoggedIn = computed(() =>
    this.supabaseService.currentSession() ? true : false,
  );
  userLabel = computed(
    () =>
      this.supabaseService.currentUser()?.email?.charAt(0).toUpperCase() || 'U',
  );

  constructor() {
    let wasLoggedIn = false;
    effect(() => {
      const isLoggedIn = this.isUserLoggedIn();
      if (isLoggedIn && !wasLoggedIn) {
        this.cvStore.loadUserCVs();

        const email = this.supabaseService.currentUser()?.email;
        if (email && !this.userGuideStore.hasSeenWelcome(email)) {
          this.userGuideStore.openWelcomeModal('full');
          posthog.capture('welcome_modal_shown');
        }
      }
      wasLoggedIn = isLoggedIn;
    });
  }

  async executeSignOut() {
    await this.supabaseService.signOut();
    this.cvStore.resetStore();
    this.router.navigate(['login']);
  }
}
