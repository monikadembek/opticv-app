import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

const STORAGE_KEY = 'opticv_has_seen_welcome';

export interface UserGuideState {
  isWelcomeModalOpen: boolean;
  seenByEmail: Record<string, boolean>;
}

const initialState: UserGuideState = {
  isWelcomeModalOpen: false,
  seenByEmail: {},
};

function readSeenByEmail(platformId: object): Record<string, boolean> {
  if (!isPlatformBrowser(platformId)) return {};

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const UserGuideStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, platformId = inject(PLATFORM_ID)) => {
    patchState(store, { seenByEmail: readSeenByEmail(platformId) });

    return {
      hasSeenWelcome(email: string | null | undefined): boolean {
        if (!email) return false;
        return !!store.seenByEmail()[email];
      },
      openWelcomeModal(): void {
        patchState(store, { isWelcomeModalOpen: true });
      },
      closeWelcomeModal(): void {
        patchState(store, { isWelcomeModalOpen: false });
      },
      markWelcomeSeen(email: string): void {
        const seenByEmail = { ...store.seenByEmail(), [email]: true };
        patchState(store, { seenByEmail, isWelcomeModalOpen: false });

        if (isPlatformBrowser(platformId)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seenByEmail));
        }
      },
    };
  }),
);
