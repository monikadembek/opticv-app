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

  describe('openWelcomeModal', () => {
    it('opens in full mode, resetting to the intro screen', () => {
      const store = setup();

      store.openWelcomeModal('full');

      expect(store.isWelcomeModalOpen()).toBe(true);
      expect(store.mode()).toBe('full');
      expect(store.screen()).toBe('intro');
      expect(store.stepIndex()).toBe(0);
    });

    it('opens in tour mode, resetting to the tour screen at step 1', () => {
      const store = setup();

      store.openWelcomeModal('tour');

      expect(store.isWelcomeModalOpen()).toBe(true);
      expect(store.mode()).toBe('tour');
      expect(store.screen()).toBe('tour');
      expect(store.stepIndex()).toBe(0);
    });
  });

  describe('closeWelcomeModal', () => {
    it('closes the modal', () => {
      const store = setup();
      store.openWelcomeModal('full');

      store.closeWelcomeModal();

      expect(store.isWelcomeModalOpen()).toBe(false);
    });
  });

  describe('startTour', () => {
    it('transitions from intro to tour and resets stepIndex', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.goToStep(3);

      store.startTour();

      expect(store.screen()).toBe('tour');
      expect(store.stepIndex()).toBe(0);
    });
  });

  describe('nextStep', () => {
    it('increments stepIndex while below the last step', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.startTour();

      store.nextStep();

      expect(store.stepIndex()).toBe(1);
      expect(store.screen()).toBe('tour');
    });

    it('transitions to the finish screen at the last step in full mode', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.startTour();
      store.goToStep(5);

      store.nextStep();

      expect(store.screen()).toBe('finish');
      expect(store.stepIndex()).toBe(5);
    });

    it('is a no-op on step/screen at the last step in tour mode', () => {
      const store = setup();
      store.openWelcomeModal('tour');
      store.goToStep(5);

      store.nextStep();

      expect(store.screen()).toBe('tour');
      expect(store.stepIndex()).toBe(5);
    });
  });

  describe('prevStep', () => {
    it('decrements stepIndex while above zero', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.goToStep(2);

      store.prevStep();

      expect(store.stepIndex()).toBe(1);
    });

    it('returns to the intro screen at step 0 in full mode', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.startTour();

      store.prevStep();

      expect(store.screen()).toBe('intro');
    });

    it('is a no-op at step 0 in tour mode', () => {
      const store = setup();
      store.openWelcomeModal('tour');

      store.prevStep();

      expect(store.screen()).toBe('tour');
      expect(store.stepIndex()).toBe(0);
    });
  });

  describe('goToStep', () => {
    it('jumps to the given step and sets the tour screen', () => {
      const store = setup();
      store.openWelcomeModal('full');

      store.goToStep(4);

      expect(store.stepIndex()).toBe(4);
      expect(store.screen()).toBe('tour');
    });
  });

  describe('replayTour', () => {
    it('resets to the intro screen at step 0', () => {
      const store = setup();
      store.openWelcomeModal('full');
      store.goToStep(5);

      store.replayTour();

      expect(store.screen()).toBe('intro');
      expect(store.stepIndex()).toBe(0);
    });
  });

  describe('markWelcomeSeen', () => {
    it('adds the email to seenByEmail and closes the modal', () => {
      const store = setup();
      store.openWelcomeModal('full');

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
