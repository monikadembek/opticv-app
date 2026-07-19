import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import posthog from 'posthog-js';
import { WelcomeGuideModal } from './welcome-guide-modal';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { Supabase } from '../../core/auth/services/supabase';

function createUserGuideStoreMock() {
  return {
    isWelcomeModalOpen: signal(false),
    seenByEmail: signal({}),
    hasSeenWelcome: vi.fn().mockReturnValue(false),
    openWelcomeModal: vi.fn(),
    closeWelcomeModal: vi.fn(),
    markWelcomeSeen: vi.fn(),
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

  async function setup(email: string | null = 'user@example.com') {
    TestBed.resetTestingModule();
    userGuideStoreMock = createUserGuideStoreMock();
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

  it('renders the three step blocks', async () => {
    await setup();
    userGuideStoreMock.isWelcomeModalOpen.set(true);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Upload your CV');
    expect(text).toContain('Paste job description');
    expect(text).toContain('Get your optimized CV');
  });

  describe('onHide', () => {
    it('calls markWelcomeSeen with the current user email', async () => {
      await setup('user@example.com');

      fixture.componentInstance.onHide();

      expect(userGuideStoreMock.markWelcomeSeen).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(userGuideStoreMock.closeWelcomeModal).not.toHaveBeenCalled();
    });

    it('calls closeWelcomeModal when no email is available', async () => {
      await setup(null);

      fixture.componentInstance.onHide();

      expect(userGuideStoreMock.closeWelcomeModal).toHaveBeenCalled();
      expect(userGuideStoreMock.markWelcomeSeen).not.toHaveBeenCalled();
    });

    it('captures welcome_modal_dismissed', async () => {
      await setup('user@example.com');
      const captureSpy = vi.spyOn(posthog, 'capture');

      fixture.componentInstance.onHide();

      expect(captureSpy).toHaveBeenCalledWith('welcome_modal_dismissed');
    });
  });
});
