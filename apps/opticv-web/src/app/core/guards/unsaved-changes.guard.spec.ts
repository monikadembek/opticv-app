import type {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import {
  type HasUnsavedChanges,
  unsavedChangesGuard,
} from './unsaved-changes.guard';

const route = {} as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;

function runGuard(component: HasUnsavedChanges | null, nextUrl: string) {
  return unsavedChangesGuard(
    component as HasUnsavedChanges,
    route,
    state('/cv-builder'),
    state(nextUrl),
  );
}

describe('unsavedChangesGuard', () => {
  it('returns what the component decides', async () => {
    expect(runGuard({ canDeactivate: () => true }, '/dashboard')).toBe(true);
    expect(runGuard({ canDeactivate: () => false }, '/dashboard')).toBe(false);
    await expect(
      runGuard({ canDeactivate: () => Promise.resolve(false) }, '/dashboard'),
    ).resolves.toBe(false);
  });

  it('always allows navigation to the login page without asking', () => {
    const canDeactivate = vi.fn().mockReturnValue(false);

    expect(runGuard({ canDeactivate }, '/login')).toBe(true);
    expect(runGuard({ canDeactivate }, '/login?returnUrl=%2Fx')).toBe(true);
    expect(canDeactivate).not.toHaveBeenCalled();
  });

  it('allows navigation when there is no component', () => {
    expect(runGuard(null, '/dashboard')).toBe(true);
  });
});
