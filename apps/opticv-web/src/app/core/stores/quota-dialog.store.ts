import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { QuotaErrorPayload } from '@opticv/datatypes';

export interface QuotaDialogState {
  payload: QuotaErrorPayload | null;
}

const initialState: QuotaDialogState = { payload: null };

export const QuotaDialogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isOpen: computed(() => store.payload() !== null),
  })),
  withMethods((store) => ({
    open(payload: QuotaErrorPayload): void {
      if (store.payload() === null) {
        patchState(store, { payload });
      }
    },
    close(): void {
      patchState(store, { payload: null });
    },
  })),
);
