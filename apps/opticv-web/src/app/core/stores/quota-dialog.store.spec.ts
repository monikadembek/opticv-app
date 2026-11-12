import { TestBed } from '@angular/core/testing';
import type { QuotaErrorPayload } from '@opticv/datatypes';
import { QuotaDialogStore } from './quota-dialog.store';

const quotaExceeded: QuotaErrorPayload = {
  code: 'QUOTA_EXCEEDED',
  feature: 'CV_OPTIMIZATION',
  limit: 1,
  resetsAt: null,
  cancelAtPeriodEnd: false,
};

const cvLimit: QuotaErrorPayload = { code: 'CV_LIMIT_EXCEEDED', limit: 1 };

describe('QuotaDialogStore', () => {
  let store: InstanceType<typeof QuotaDialogStore>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = TestBed.inject(QuotaDialogStore);
  });

  it('starts closed', () => {
    expect(store.payload()).toBeNull();
    expect(store.isOpen()).toBe(false);
  });

  it('opens with the given payload', () => {
    store.open(quotaExceeded);
    expect(store.payload()).toEqual(quotaExceeded);
    expect(store.isOpen()).toBe(true);
  });

  it('ignores further payloads while open', () => {
    store.open(quotaExceeded);
    store.open(cvLimit);
    expect(store.payload()).toEqual(quotaExceeded);
  });

  it('closes and can be reopened with a new payload', () => {
    store.open(quotaExceeded);
    store.close();
    expect(store.isOpen()).toBe(false);

    store.open(cvLimit);
    expect(store.payload()).toEqual(cvLimit);
  });
});
