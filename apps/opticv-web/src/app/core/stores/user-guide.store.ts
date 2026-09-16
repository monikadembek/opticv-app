import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

const STORAGE_KEY = 'opticv_has_seen_welcome';

export type WelcomeModalMode = 'full' | 'tour';
export type WelcomeModalScreen = 'intro' | 'tour' | 'finish';

export interface UserGuideState {
  isWelcomeModalOpen: boolean;
  mode: WelcomeModalMode;
  screen: WelcomeModalScreen;
  stepIndex: number;
  seenByEmail: Record<string, boolean>;
}

export const LAST_STEP_INDEX = 6;

const initialState: UserGuideState = {
  isWelcomeModalOpen: false,
  mode: 'full',
  screen: 'intro',
  stepIndex: 0,
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
      openWelcomeModal(mode: WelcomeModalMode): void {
        if (mode === 'full') {
          patchState(store, {
            isWelcomeModalOpen: true,
            mode: 'full',
            screen: 'intro',
            stepIndex: 0,
          });
        } else {
          patchState(store, {
            isWelcomeModalOpen: true,
            mode: 'tour',
            screen: 'tour',
            stepIndex: 0,
          });
        }
      },
      closeWelcomeModal(): void {
        patchState(store, { isWelcomeModalOpen: false });
      },
      startTour(): void {
        patchState(store, { screen: 'tour', stepIndex: 0 });
      },
      nextStep(): void {
        const stepIndex = store.stepIndex();
        if (stepIndex < LAST_STEP_INDEX) {
          patchState(store, { stepIndex: stepIndex + 1 });
          return;
        }
        if (store.mode() === 'full') {
          patchState(store, { screen: 'finish' });
        }
      },
      prevStep(): void {
        const stepIndex = store.stepIndex();
        if (stepIndex > 0) {
          patchState(store, { stepIndex: stepIndex - 1 });
          return;
        }
        if (store.mode() === 'full') {
          patchState(store, { screen: 'intro' });
        }
      },
      goToStep(index: number): void {
        patchState(store, { stepIndex: index, screen: 'tour' });
      },
      replayTour(): void {
        patchState(store, { screen: 'intro', stepIndex: 0 });
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
