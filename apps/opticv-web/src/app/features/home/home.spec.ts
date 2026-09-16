import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { Home } from './home';
import { Supabase } from '../../core/auth/services/supabase';
import { CvApiService } from '../../core/services/cv-api.service';
import { CvStore } from '../../core/stores/cv.store';

const mockCv: CvDocumentListItem = {
  id: 'cv-id-1',
  fileName: 'my-cv.pdf',
  fileSize: 2048,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01').toISOString(),
  parsedText: null,
  parseStatus: 'COMPLETED',
};

function makeSupabaseMock(loggedIn = false) {
  return {
    currentSession: signal(loggedIn ? { user: { id: 'user-1' } } : null),
  };
}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let router: Router;
  let cvApiService: { getUserCvs: ReturnType<typeof vi.fn> };

  async function createComponent(loggedIn = false, cvList: CvDocumentListItem[] = [mockCv]) {
    TestBed.resetTestingModule();
    cvApiService = { getUserCvs: vi.fn().mockReturnValue(of(cvList)) };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: Supabase, useValue: makeSupabaseMock(loggedIn) },
        { provide: CvApiService, useValue: cvApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    TestBed.inject(CvStore).loadUserCVs();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero heading', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toContain('Land more interviews,');
    expect(h1.textContent.trim()).toContain('one tailored CV at a time.');
  });

  it('should render the "Optimize my CV" button when logged in with a CV', async () => {
    await createComponent(true, [mockCv]);
    const button = fixture.nativeElement.querySelector(
      'p-button[label="Optimize my CV"]',
    );
    expect(button).not.toBeNull();
  });

  describe('Optimize / Upload button', () => {
    it('renders "Optimize my CV" when the user has a CV', async () => {
      await createComponent(true, [mockCv]);
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Optimize my CV"]',
      );
      expect(button).not.toBeNull();
    });

    it('renders "Upload your first CV" when the user has no CV', async () => {
      await createComponent(true, []);
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Upload your first CV"]',
      );
      expect(button).not.toBeNull();
    });
  });

  describe('Sign In button', () => {
    it('renders the Sign In button when the user is not logged in', async () => {
      await createComponent(false);
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Sign In"]',
      );
      expect(button).not.toBeNull();
    });

    it('does not render the Sign In button when the user is logged in', async () => {
      await createComponent(true);
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Sign In"]',
      );
      expect(button).toBeNull();
    });
  });

  it('should navigate to cv-optimization when goToCreator is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.goToCreator();
    expect(navigateSpy).toHaveBeenCalledWith(['cv-optimization']);
  });

  it('should navigate to login when signIn is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.signIn();
    expect(navigateSpy).toHaveBeenCalledWith(['login']);
  });

  describe('isUserLoggedIn', () => {
    it('returns false when there is no session', async () => {
      await createComponent(false);
      expect(component.isUserLoggedIn()).toBe(false);
    });

    it('returns true when a session exists', async () => {
      await createComponent(true);
      expect(component.isUserLoggedIn()).toBe(true);
    });
  });
});
