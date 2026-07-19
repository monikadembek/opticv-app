import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import posthog from 'posthog-js';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { Supabase } from '../../core/auth/services/supabase';

@Component({
  selector: 'app-welcome-guide-modal',
  imports: [DialogModule, ButtonModule, NgOptimizedImage],
  templateUrl: './welcome-guide-modal.html',
  styleUrl: './welcome-guide-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeGuideModal {
  protected readonly userGuideStore = inject(UserGuideStore);
  private readonly supabase = inject(Supabase);

  onHide(): void {
    const email = this.supabase.currentUser()?.email;

    if (email) {
      this.userGuideStore.markWelcomeSeen(email);
    } else {
      this.userGuideStore.closeWelcomeModal();
    }

    posthog.capture('welcome_modal_dismissed');
  }
}
