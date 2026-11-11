import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { vi } from 'vitest';
import posthog from 'posthog-js';
import { TopHeader } from './top-header';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { BillingRedirectService } from '../../core/services/billing-redirect.service';

function createUserGuideStoreMock() {
  return {
    openWelcomeModal: vi.fn(),
  };
}

const profile = signal<unknown>(null);
const redirectingToPortal = signal(false);

function createBillingMock() {
  return {
    openPortal: vi.fn(),
    redirectingToPortal: redirectingToPortal.asReadonly(),
  };
}

// PrimeNG Menubar calls window.matchMedia during init, which doesn't exist in jsdom
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('TopHeader', () => {
  let component: TopHeader;
  let fixture: ComponentFixture<TopHeader>;
  let router: Router;
  let userGuideStoreMock: ReturnType<typeof createUserGuideStoreMock>;
  let billingMock: ReturnType<typeof createBillingMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    userGuideStoreMock = createUserGuideStoreMock();
    billingMock = createBillingMock();
    profile.set(null);
    redirectingToPortal.set(false);
    await TestBed.configureTestingModule({
      imports: [TopHeader],
      providers: [
        provideRouter([]),
        { provide: UserGuideStore, useValue: userGuideStoreMock },
        {
          provide: UserSettingsApiService,
          useValue: { userProfile: { value: profile } },
        },
        { provide: BillingRedirectService, useValue: billingMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopHeader);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('menu items', () => {
    it('should show Home and Pricing when not logged in', () => {
      fixture.componentRef.setInput('isLoggedIn', false);
      fixture.detectChanges();
      expect(component.items).toHaveLength(2);
      expect(component.items![0].label).toBe('Home');
      expect(component.items![0]['route']).toBe('/home');
      expect(component.items![1].label).toBe('Pricing');
      expect(component.items![1]['route']).toBe('/pricing');
    });

    it('should add Dashboard, Upload CV, Optimize CV and Pricing items when logged in', () => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();
      expect(component.items).toHaveLength(5);
      expect(component.items![1].label).toBe('Dashboard');
      expect(component.items![1]['route']).toBe('/dashboard');
      expect(component.items![2].label).toBe('Upload CV');
      expect(component.items![2]['route']).toBe('/upload-cv');
      expect(component.items![3].label).toBe('Optimize CV');
      expect(component.items![3]['route']).toBe('/cv-optimization');
      expect(component.items![4].label).toBe('Pricing');
      expect(component.items![4]['route']).toBe('/pricing');
    });
  });

  describe('inputs', () => {
    it('should default isLoggedIn to false', () => {
      expect(component.isLoggedIn()).toBe(false);
    });

    it('should default userLabel to "U"', () => {
      expect(component.userLabel()).toBe('U');
    });
  });

  describe('when not logged in', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isLoggedIn', false);
      fixture.detectChanges();
    });

    it('should show Sign In button', () => {
      const signInButton = fixture.debugElement.query(
        By.css('p-button[label="Sign In"]'),
      );
      expect(signInButton).toBeTruthy();
    });

    it('should not show Sign Out button', () => {
      const signOutButton = fixture.debugElement.query(
        By.css('p-button[title="Sign Out"]'),
      );
      expect(signOutButton).toBeNull();
    });

    it('should not show avatar button', () => {
      expect(
        fixture.debugElement.query(By.css('button.header__avatar-button')),
      ).toBeNull();
    });

    it('should not show avatar', () => {
      const avatar = fixture.debugElement.query(By.css('p-avatar'));
      expect(avatar).toBeNull();
    });

    it('should not show the help icon button', () => {
      const helpButton = fixture.debugElement.query(
        By.css('p-button[ariaLabel="Open help guide"]'),
      );
      expect(helpButton).toBeNull();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.componentRef.setInput('userLabel', 'M');
      fixture.detectChanges();
    });

    it('should not show the standalone Sign Out button', () => {
      const signOutButton = fixture.debugElement.query(
        By.css('p-button[title="Sign Out"]'),
      );
      expect(signOutButton).toBeNull();
    });

    it('should show the avatar button with correct ARIA attributes', () => {
      const button = fixture.debugElement.query(
        By.css('button.header__avatar-button'),
      ).nativeElement as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Open user menu');
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should only set aria-controls while the menu is open', () => {
      const button = fixture.debugElement.query(
        By.css('button.header__avatar-button'),
      ).nativeElement as HTMLButtonElement;
      expect(button.hasAttribute('aria-controls')).toBe(false);

      component.isUserMenuOpen.set(true);
      fixture.detectChanges();
      expect(button.getAttribute('aria-controls')).toBe(component.userMenuId);
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('should not put the menu id on the p-menu host element', () => {
      const host = fixture.debugElement.query(By.css('p-menu'))
        .nativeElement as HTMLElement;
      expect(host.getAttribute('id')).toBeNull();
    });

    it('should reset isUserMenuOpen when the user logs out', () => {
      component.isUserMenuOpen.set(true);
      fixture.componentRef.setInput('isLoggedIn', false);
      fixture.detectChanges();
      expect(component.isUserMenuOpen()).toBe(false);

      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();
      const button = fixture.debugElement.query(
        By.css('button.header__avatar-button'),
      ).nativeElement as HTMLButtonElement;
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not show Sign In button', () => {
      const signInButton = fixture.debugElement.query(
        By.css('p-button[label="Sign In"]'),
      );
      expect(signInButton).toBeNull();
    });

    it('should show avatar with user label', () => {
      const avatar = fixture.debugElement.query(By.css('p-avatar'));
      expect(avatar).toBeTruthy();
      expect(component.userLabel()).toBe('M');
    });

    it('should show the help icon button', () => {
      const helpButton = fixture.debugElement.query(
        By.css('p-button[ariaLabel="Open help guide"]'),
      );
      expect(helpButton).toBeTruthy();
    });
  });

  describe('navigateToLoginPage', () => {
    it('should navigate to /login', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.navigateToLoginPage();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('user menu', () => {
    const billingGroup = () => component.userMenuItems()[0];
    const billingItem = () => billingGroup().items![0];
    const profileGroup = () => component.userMenuItems()[2];
    const accountSettingsItem = () => profileGroup().items![0];
    const signOutItem = () => profileGroup().items![1];
    const run = (item: MenuItem) => item.command?.({});
    const withTier = (tier: string) => profile.set({ subscription: { tier } });

    it('should have Plan & Billing group, separator and Profile group in order', () => {
      const entries = component.userMenuItems();
      expect(entries).toHaveLength(3);
      expect(entries[0].label).toContain('Plan & Billing');
      expect(entries[1].separator).toBe(true);
      expect(entries[2].label).toBe('Profile');
    });

    it('should list Account Settings and Sign Out in the Profile group', () => {
      expect(profileGroup().items!.map((i) => i.label)).toEqual([
        'Account Settings',
        'Sign Out',
      ]);
    });

    it('should navigate to /settings from Account Settings', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      run(accountSettingsItem());
      expect(navigateSpy).toHaveBeenCalledWith(['/settings']);
    });

    it('should show Free plan and Upgrade action for FREE tier', () => {
      withTier('FREE');
      expect(billingGroup().label).toBe('Plan & Billing · Free Plan');
      expect(billingItem().label).toBe('Upgrade');
      expect(billingItem().disabled).toBe(false);
    });

    it('should navigate to /pricing when Upgrade is clicked', () => {
      withTier('FREE');
      const navigateSpy = vi.spyOn(router, 'navigate');
      run(billingItem());
      expect(navigateSpy).toHaveBeenCalledWith(['/pricing']);
      expect(billingMock.openPortal).not.toHaveBeenCalled();
    });

    it.each([
      ['BASIC', 'Basic'],
      ['PRO', 'Pro'],
    ])('should show %s plan and Manage subscription action', (tier, name) => {
      withTier(tier);
      expect(billingGroup().label).toBe(`Plan & Billing · ${name} Plan`);
      expect(billingItem().label).toBe('Manage subscription');
      expect(billingItem().disabled).toBe(false);
    });

    it.each(['BASIC', 'PRO'])(
      'should open the billing portal for %s tier',
      (tier) => {
        withTier(tier);
        const navigateSpy = vi.spyOn(router, 'navigate');
        run(billingItem());
        expect(billingMock.openPortal).toHaveBeenCalledTimes(1);
        expect(navigateSpy).not.toHaveBeenCalled();
      },
    );

    it('should disable Manage subscription while redirecting to the portal', () => {
      withTier('PRO');
      redirectingToPortal.set(true);
      expect(billingItem().disabled).toBe(true);
    });

    it('should not disable Upgrade while redirecting to the portal', () => {
      withTier('FREE');
      redirectingToPortal.set(true);
      expect(billingItem().disabled).toBe(false);
    });

    it('should show no tier and disable the billing action when profile is missing', () => {
      expect(billingGroup().label).toBe('Plan & Billing');
      expect(billingItem().disabled).toBe(true);
    });

    it('should show no tier and disable the billing action when subscription is missing', () => {
      profile.set({});
      expect(billingGroup().label).toBe('Plan & Billing');
      expect(billingItem().disabled).toBe(true);
    });

    it('should emit signOut from Sign Out', () => {
      const signOutSpy = vi.fn();
      component.signOut.subscribe(signOutSpy);
      run(signOutItem());
      expect(signOutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('emitSignOut', () => {
    it('should emit signOut event', () => {
      const signOutSpy = vi.fn();
      component.signOut.subscribe(signOutSpy);
      component.emitSignOut();
      expect(signOutSpy).toHaveBeenCalledTimes(1);
    });

    it('captures signout_button_clicked', () => {
      const captureSpy = vi.spyOn(posthog, 'capture');
      component.emitSignOut();
      expect(captureSpy).toHaveBeenCalledWith('signout_button_clicked', {
        place: 'user menu',
        button_title: 'Sign Out',
      });
    });
  });

  describe('openHelp', () => {
    it('opens the welcome modal via UserGuideStore', () => {
      component.openHelp();
      expect(userGuideStoreMock.openWelcomeModal).toHaveBeenCalledWith('tour');
    });

    it('captures help_icon_clicked', () => {
      const captureSpy = vi.spyOn(posthog, 'capture');
      component.openHelp();
      expect(captureSpy).toHaveBeenCalledWith('help_icon_clicked', {
        place: 'top header',
        button_title: 'Help',
      });
    });

    it('calls openWelcomeModal when the help icon is clicked', () => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();
      const helpButton = fixture.debugElement.query(
        By.css('p-button[ariaLabel="Open help guide"]'),
      );
      helpButton.triggerEventHandler('onClick');
      expect(userGuideStoreMock.openWelcomeModal).toHaveBeenCalledWith('tour');
    });
  });
});
