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
      updateCvList(cvs: CvDocumentListItem[]): void {
        patchState(store, { cvList: cvs });
      },
      loadUserCVs(): void {
        patchState(store, { loading: true });
        cvApiService
          .getUserCvs()
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (cvs) => {
              console.log(cvs);
              patchState(store, { cvList: cvs });
            },
            error: (error) =>
              patchState(store, { loading: false, error: error }),
          });
      },
    }),
  ),
);
