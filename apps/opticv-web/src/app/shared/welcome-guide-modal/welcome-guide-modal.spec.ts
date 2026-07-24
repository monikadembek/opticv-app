import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import posthog from 'posthog-js';
import { WelcomeGuideModal } from './welcome-guide-modal';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { Supabase } from '../../core/auth/services/supabase';

function createUserGuideStoreMock(
  overrides: {
    mode?: 'full' | 'tour';
    screen?: 'intro' | 'tour' | 'finish';
    stepIndex?: number;
  } = {},
) {
  return {
    isWelcomeModalOpen: signal(false),
    mode: signal(overrides.mode ?? 'full'),
    screen: signal(overrides.screen ?? 'intro'),
    stepIndex: signal(overrides.stepIndex ?? 0),
    seenByEmail: signal({}),
    hasSeenWelcome: vi.fn().mockReturnValue(false),
    openWelcomeModal: vi.fn(),
    closeWelcomeModal: vi.fn(),
    markWelcomeSeen: vi.fn(),
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    goToStep: vi.fn(),
    replayTour: vi.fn(),
  };
}

function createSupabaseMock(email: string | null) {
  return {
    currentUser: signal(email ? { email } : null),
  };
}

describe('WelcomeGuideModal', () => {
  let fixture: ComponentFixture<WelcomeGuideModal>;
  let userGuideStoreMock: ReturnType<typeof createUserGuideStoreMock>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  async function setup(
    email: string | null = 'user@example.com',
    overrides: Parameters<typeof createUserGuideStoreMock>[0] = {},
  ) {
    TestBed.resetTestingModule();
    userGuideStoreMock = createUserGuideStoreMock(overrides);
    supabaseMock = createSupabaseMock(email);

    await TestBed.configureTestingModule({
      imports: [WelcomeGuideModal],
      providers: [
        { provide: UserGuideStore, useValue: userGuideStoreMock },
        { provide: Supabase, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeGuideModal);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('binds dialog visibility to isWelcomeModalOpen', async () => {
    await setup();
    userGuideStoreMock.isWelcomeModalOpen.set(true);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    expect(dialog).toBeTruthy();
  });

  describe('full-mode intro screen', () => {
    it('renders intro content and no tour/finish content', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'intro' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).toContain('Welcome to OptiCV');
      expect(text).toContain('Take the tour');
      expect(text).toContain("Skip - I'll explore on my own");
      expect(text).not.toContain('Quick tour');
      expect(text).not.toContain("You're ready to go");
    });

    it('clicking "Take the tour" calls startTour', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'intro' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onStartTour();

      expect(userGuideStoreMock.startTour).toHaveBeenCalledOnce();
    });

    it('clicking Skip marks welcome as seen and closes', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'intro' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onSkip();

      expect(userGuideStoreMock.markWelcomeSeen).toHaveBeenCalledWith(
        'user@example.com',
      );
    });
  });

  describe('full-mode tour screen', () => {
    it('renders step content from currentStep', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).toContain('Upload your CV once');
      expect(text).toContain('1 / 7');
    });

    it('shows Back button on step 1 in full mode', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector(
        'p-button[label="Back"]',
      );
      expect(backButton).toBeTruthy();
    });

    it('clicking Next calls nextStep', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onNext();

      expect(userGuideStoreMock.nextStep).toHaveBeenCalledOnce();
    });

    it('clicking Back calls prevStep', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 1,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onPrev();

      expect(userGuideStoreMock.prevStep).toHaveBeenCalledOnce();
    });

    it('clicking a dot calls goToStep with its index', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onDotClick(3);

      expect(userGuideStoreMock.goToStep).toHaveBeenCalledWith(3);
    });

    it('label reads "Finish" on the last step', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 6,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Finish');
    });

    it('clicking Finish on step 7 in full mode marks welcome as seen', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 6,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onNext();

      expect(userGuideStoreMock.nextStep).toHaveBeenCalledOnce();
    });

    it('clicking the close (x) button mid-tour in full mode marks seen', async () => {
      await setup('user@example.com', {
        mode: 'full',
        screen: 'tour',
        stepIndex: 2,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onCloseIcon();

      expect(userGuideStoreMock.markWelcomeSeen).toHaveBeenCalledWith(
        'user@example.com',
      );
    });
  });

  describe('full-mode finish screen', () => {
    it('renders finish content', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'finish' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).toContain("You're ready to go");
      expect(text).toContain('Get started');
      expect(text).toContain('Replay the tour');
    });

    it('clicking Get started marks welcome as seen', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'finish' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onGetStarted();

      expect(userGuideStoreMock.markWelcomeSeen).toHaveBeenCalledWith(
        'user@example.com',
      );
    });

    it('clicking Replay the tour calls replayTour', async () => {
      await setup('user@example.com', { mode: 'full', screen: 'finish' });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onReplay();

      expect(userGuideStoreMock.replayTour).toHaveBeenCalledOnce();
    });
  });

  describe('tour mode (help icon)', () => {
    it('opens directly to the tour screen with no intro/finish content', async () => {
      await setup('user@example.com', {
        mode: 'tour',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).toContain('Upload your CV once');
      expect(text).not.toContain('Welcome to OptiCV');
      expect(text).not.toContain("You're ready to go");
    });

    it('hides the Back button on step 1', async () => {
      await setup('user@example.com', {
        mode: 'tour',
        screen: 'tour',
        stepIndex: 0,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector(
        'p-button[label="Back"]',
      );
      expect(backButton).toBeFalsy();
    });

    it('shows and wires the Back button from step 2 onward', async () => {
      await setup('user@example.com', {
        mode: 'tour',
        screen: 'tour',
        stepIndex: 1,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector(
        'p-button[label="Back"]',
      );
      expect(backButton).toBeTruthy();

      fixture.componentInstance.onPrev();
      expect(userGuideStoreMock.prevStep).toHaveBeenCalledOnce();
    });

    it('clicking Finish on step 7 closes the modal without marking seen', async () => {
      await setup('user@example.com', {
        mode: 'tour',
        screen: 'tour',
        stepIndex: 6,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onNext();

      expect(userGuideStoreMock.closeWelcomeModal).toHaveBeenCalledOnce();
      expect(userGuideStoreMock.markWelcomeSeen).not.toHaveBeenCalled();
    });

    it('clicking the close (x) button does not mark seen', async () => {
      await setup('user@example.com', {
        mode: 'tour',
        screen: 'tour',
        stepIndex: 2,
      });
      userGuideStoreMock.isWelcomeModalOpen.set(true);
      fixture.detectChanges();

      fixture.componentInstance.onCloseIcon();

      expect(userGuideStoreMock.closeWelcomeModal).toHaveBeenCalledOnce();
      expect(userGuideStoreMock.markWelcomeSeen).not.toHaveBeenCalled();
    });
  });

  describe('onHide', () => {
    it('calls markWelcomeSeen with the current user email in full mode', async () => {
      await setup('user@example.com', { mode: 'full' });

      fixture.componentInstance.onHide();

      expect(userGuideStoreMock.markWelcomeSeen).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(userGuideStoreMock.closeWelcomeModal).not.toHaveBeenCalled();
    });

    it('calls closeWelcomeModal when no email is available in full mode', async () => {
      await setup(null, { mode: 'full' });

      fixture.componentInstance.onHide();

      expect(userGuideStoreMock.closeWelcomeModal).toHaveBeenCalled();
      expect(userGuideStoreMock.markWelcomeSeen).not.toHaveBeenCalled();
    });

    it('captures welcome_modal_dismissed', async () => {
      await setup('user@example.com', { mode: 'full' });
      const captureSpy = vi.spyOn(posthog, 'capture');

      fixture.componentInstance.onHide();

      expect(captureSpy).toHaveBeenCalledWith('welcome_modal_dismissed');
    });
  });
});
