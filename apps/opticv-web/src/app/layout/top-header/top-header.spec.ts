import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TopHeader } from './top-header';

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

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TopHeader],
      providers: [provideRouter([])],
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
    it('should initialize with only Home when not logged in', () => {
      fixture.componentRef.setInput('isLoggedIn', false);
      fixture.detectChanges();
      expect(component.items).toHaveLength(1);
      expect(component.items![0].label).toBe('Home');
      expect(component.items![0]['route']).toBe('/');
    });

    it('should add Dashboard and Upload CV items when logged in', () => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.detectChanges();
      expect(component.items).toHaveLength(4);
      expect(component.items![1].label).toBe('Dashboard');
      expect(component.items![1]['route']).toBe('/dashboard');
      expect(component.items![2].label).toBe('CV Optimization');
      expect(component.items![2]['route']).toBe('/cv-optimization');
      expect(component.items![3].label).toBe('Upload CV');
      expect(component.items![3]['route']).toBe('/upload-cv');
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
        By.css('p-button[label="Sign Out"]'),
      );
      expect(signOutButton).toBeNull();
    });

    it('should not show avatar', () => {
      const avatar = fixture.debugElement.query(By.css('p-avatar'));
      expect(avatar).toBeNull();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isLoggedIn', true);
      fixture.componentRef.setInput('userLabel', 'M');
      fixture.detectChanges();
    });

    it('should show Sign Out button', () => {
      const signOutButton = fixture.debugElement.query(
        By.css('p-button[label="Sign Out"]'),
      );
      expect(signOutButton).toBeTruthy();
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
  });

  describe('navigateToLoginPage', () => {
    it('should navigate to /login', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.navigateToLoginPage();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('emitSignOut', () => {
    it('should emit signOut event', () => {
      const signOutSpy = vi.fn();
      component.signOut.subscribe(signOutSpy);
      component.emitSignOut();
      expect(signOutSpy).toHaveBeenCalledTimes(1);
    });
  });
});
