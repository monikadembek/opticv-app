import { computed, DestroyRef, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { CvDocumentListItem } from '@opticv/datatypes';
import { CvApiService } from '../services/cv-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface CvState {
  cvList: CvDocumentListItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CvState = {
  cvList: [],
  loading: false,
  error: null,
};

export const CvStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ cvList }) => ({
    hasCv: computed(() => cvList().length > 0),
  })),
  withMethods(
    (
      store,
      cvApiService = inject(CvApiService),
      destroyRef = inject(DestroyRef),
    ) => ({
      resetStore(): void {
        patchState(store, initialState);
      },
      updateCvList(cvs: CvDocumentListItem[]): void {
        patchState(store, { cvList: cvs });
      },
      loadUserCVs(force = false): void {
        // use force parameter to refresh store
        // Fixes the redundant CV list fetch by making CvStore skip reloading when data already exists
        if (!force && (store.loading() || store.cvList().length > 0)) return;

        patchState(store, { loading: true });
        cvApiService
          .getUserCvs()
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (cvs) => {
              patchState(store, { cvList: cvs, loading: false, error: null });
            },
            error: (error) =>
              patchState(store, {
                loading: false,
                error:
                  error?.error?.message ??
                  'Failed to load files. Please try again.',
              }),
          });
      },
    }),
  ),
);
