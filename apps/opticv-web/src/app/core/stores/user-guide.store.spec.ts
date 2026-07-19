import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { UserGuideStore } from './user-guide.store';

const STORAGE_KEY = 'opticv_has_seen_welcome';

describe('UserGuideStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(platformId: 'browser' | 'server' = 'browser') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });

    return TestBed.inject(UserGuideStore);
  }

  it('initialises with empty state when localStorage is empty', () => {
    const store = setup();

    expect(store.isWelcomeModalOpen()).toBe(false);
    expect(store.seenByEmail()).toEqual({});
  });

  it('reads existing seenByEmail from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'a@example.com': true }));

    const store = setup();

    expect(store.seenByEmail()).toEqual({ 'a@example.com': true });
  });

  it('falls back to empty object on malformed localStorage value', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    const store = setup();

    expect(store.seenByEmail()).toEqual({});
  });

  it('does not read localStorage on the server', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'a@example.com': true }));

    const store = setup('server');

    expect(store.seenByEmail()).toEqual({});
  });

  describe('hasSeenWelcome', () => {
    it('returns false for null/undefined/empty email', () => {
      const store = setup();

      expect(store.hasSeenWelcome(null)).toBe(false);
      expect(store.hasSeenWelcome(undefined)).toBe(false);
      expect(store.hasSeenWelcome('')).toBe(false);
    });

    it('returns false for an email not in the map', () => {
      const store = setup();

      expect(store.hasSeenWelcome('unknown@example.com')).toBe(false);
    });

    it('returns true for an email present in the map', () => {
      const store = setup();
      store.markWelcomeSeen('seen@example.com');

      expect(store.hasSeenWelcome('seen@example.com')).toBe(true);
    });
  });

  describe('openWelcomeModal / closeWelcomeModal', () => {
    it('opens the modal', () => {
      const store = setup();

      store.openWelcomeModal();

      expect(store.isWelcomeModalOpen()).toBe(true);
    });

    it('closes the modal', () => {
      const store = setup();
      store.openWelcomeModal();

      store.closeWelcomeModal();

      expect(store.isWelcomeModalOpen()).toBe(false);
    });
  });

  describe('markWelcomeSeen', () => {
    it('adds the email to seenByEmail and closes the modal', () => {
      const store = setup();
      store.openWelcomeModal();

      store.markWelcomeSeen('new@example.com');

      expect(store.seenByEmail()).toEqual({ 'new@example.com': true });
      expect(store.isWelcomeModalOpen()).toBe(false);
    });

    it('persists the merged map to localStorage', () => {
      const store = setup();

      store.markWelcomeSeen('new@example.com');

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
        'new@example.com': true,
      });
    });

    it('preserves previously seen emails when adding a new one', () => {
      const store = setup();
      store.markWelcomeSeen('first@example.com');

      store.markWelcomeSeen('second@example.com');

      expect(store.seenByEmail()).toEqual({
        'first@example.com': true,
        'second@example.com': true,
      });
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
        'first@example.com': true,
        'second@example.com': true,
      });
    });

    it('does not write to localStorage on the server', () => {
      const store = setup('server');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      store.markWelcomeSeen('new@example.com');

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(store.seenByEmail()).toEqual({ 'new@example.com': true });
    });
  });
});
