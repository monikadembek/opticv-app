import type { CanDeactivateFn } from '@angular/router';

/** Implemented by routed components that can hold unsaved edits. */
export interface HasUnsavedChanges {
  /** Resolves to `true` when it is safe to leave the page. */
  canDeactivate(): boolean | Promise<boolean>;
}

/**
 * Asks the routed component whether it can be left. Navigation to the login
 * page is always allowed: sign-out and session expiry end the session before
 * navigating, so staying on the page would leave the user signed out.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component,
  _currentRoute,
  _currentState,
  nextState,
) => {
  if (nextState?.url.startsWith('/login')) {
    return true;
  }
  return component?.canDeactivate() ?? true;
};
