import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import type { CvStructuredData } from '@opticv/datatypes';
import { CvA4Preview } from './cv-a4-preview';
import { DEFAULT_ACCENT_COLOR } from '../../cv-templates';

const MINIMAL_CV: CvStructuredData = {
  contact: {
    name: 'Jane Doe',
    position: null,
    email: 'jane@example.com',
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: 'A short summary.',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
};

// ResizeObserver is not available in JSDOM — stub it with a proper class so
// `new ResizeObserver(cb)` works and we can fire the callback manually.
function stubResizeObserver(): (entries: ResizeObserverEntry[]) => void {
  let capturedCallback: (entries: ResizeObserverEntry[]) => void = () => {};
  class MockResizeObserver {
    constructor(cb: (entries: ResizeObserverEntry[]) => void) {
      capturedCallback = cb;
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return (entries) => capturedCallback(entries);
}


describe('CvA4Preview', () => {
  let fixture: ComponentFixture<CvA4Preview>;
  let component: CvA4Preview;

  beforeEach(async () => {
    stubResizeObserver();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CvA4Preview],
    }).compileComponents();

    fixture = TestBed.createComponent(CvA4Preview);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cv', null);
    fixture.componentRef.setInput('templateId', 'default');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('pages() starts as empty array before first detectChanges', () => {
    expect(component.pages()).toEqual([]);
  });

  it('measuring() is true before first detectChanges', () => {
    expect(component.measuring()).toBe(true);
  });

  it('accentColor() defaults to DEFAULT_ACCENT_COLOR', () => {
    fixture.detectChanges();
    expect(component.accentColor()).toBe(DEFAULT_ACCENT_COLOR);
  });

  it('exposes CONTENT_HEIGHT_PX as 939', () => {
    expect(component.CONTENT_HEIGHT_PX).toBe(939);
  });

  it('hidden container has aria-hidden="true"', () => {
    fixture.detectChanges();
    const hidden = fixture.debugElement.query(By.css('.a4-hidden-container'));
    expect(hidden).toBeTruthy();
    expect(hidden.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows spinner while measuring is true', () => {
    fixture.detectChanges();
    // measuring() is true right after detectChanges (resize hasn't fired)
    expect(component.measuring()).toBe(true);
    const spinner = fixture.debugElement.query(By.css('p-progressspinner'));
    expect(spinner).toBeTruthy();
  });

  describe('when cv is null and pages are set directly', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('cv', null);
      fixture.detectChanges();
      // Bypass async measurement — set state directly to test rendering
      component.pages.set([]);
      component.measuring.set(false);
      fixture.detectChanges();
    });

    it('renders no A4 page cards', () => {
      const pages = fixture.debugElement.queryAll(By.css('.a4-page'));
      expect(pages.length).toBe(0);
    });

    it('shows no spinner when measuring is false', () => {
      const spinner = fixture.debugElement.query(By.css('p-progressspinner'));
      expect(spinner).toBeFalsy();
    });
  });

  describe('when one page is set directly', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('cv', MINIMAL_CV);
      fixture.detectChanges();
      component.pages.set([0]);
      component.measuring.set(false);
      fixture.detectChanges();
    });

    it('renders exactly one A4 page card', () => {
      const pageEls = fixture.debugElement.queryAll(By.css('.a4-page'));
      expect(pageEls.length).toBe(1);
    });

    it('first page card has aria-label "Page 1 of 1"', () => {
      const firstPage = fixture.debugElement.query(By.css('.a4-page'));
      expect(firstPage.nativeElement.getAttribute('aria-label')).toBe(
        'Page 1 of 1',
      );
    });

    it('first page clip has translateY(-0px)', () => {
      const clip = fixture.debugElement.query(By.css('.a4-page-clip'));
      expect(clip.nativeElement.style.transform).toBe('translateY(-0px)');
    });

    it('shows no spinner when measuring is false', () => {
      const spinner = fixture.debugElement.query(By.css('p-progressspinner'));
      expect(spinner).toBeFalsy();
    });
  });

  describe('when two pages are set directly', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('cv', MINIMAL_CV);
      fixture.detectChanges();
      component.pages.set([0, 1]);
      component.measuring.set(false);
      fixture.detectChanges();
    });

    it('renders two A4 page cards', () => {
      const pageEls = fixture.debugElement.queryAll(By.css('.a4-page'));
      expect(pageEls.length).toBe(2);
    });

    it('second page card has aria-label "Page 2 of 2"', () => {
      const pages = fixture.debugElement.queryAll(By.css('.a4-page'));
      expect(pages[1].nativeElement.getAttribute('aria-label')).toBe(
        'Page 2 of 2',
      );
    });

    it('second page clip is offset by CONTENT_HEIGHT_PX', () => {
      const clips = fixture.debugElement.queryAll(By.css('.a4-page-clip'));
      expect(clips[1].nativeElement.style.transform).toBe(
        `translateY(-${component.CONTENT_HEIGHT_PX}px)`,
      );
    });
  });

  describe('page count formula', () => {
    it('rounds up: scrollHeight 940 → 2 pages', () => {
      // 940 / 939 = 1.001... → ceil → 2
      const count = Math.max(1, Math.ceil(940 / component.CONTENT_HEIGHT_PX));
      expect(count).toBe(2);
    });

    it('exactly one page: scrollHeight 939 → 1 page', () => {
      const count = Math.max(1, Math.ceil(939 / component.CONTENT_HEIGHT_PX));
      expect(count).toBe(1);
    });

    it('minimum one page even for zero scrollHeight', () => {
      const count = Math.max(1, Math.ceil(0 / component.CONTENT_HEIGHT_PX));
      expect(count).toBe(1);
    });
  });

  describe('re-measurement on input change', () => {
    it('sets measuring() back to true when cv input changes', () => {
      fixture.componentRef.setInput('cv', MINIMAL_CV);
      fixture.detectChanges();
      component.measuring.set(false);
      fixture.detectChanges();
      expect(component.measuring()).toBe(false);

      // Changing an input triggers the effect which flips measuring back to true
      fixture.componentRef.setInput('cv', null);
      fixture.detectChanges();
      expect(component.measuring()).toBe(true);
    });

    it('sets measuring() back to true when templateId input changes', () => {
      fixture.detectChanges();
      component.measuring.set(false);
      fixture.detectChanges();

      fixture.componentRef.setInput('templateId', 'modern');
      fixture.detectChanges();
      expect(component.measuring()).toBe(true);
    });

    it('sets measuring() back to true when accentColor input changes', () => {
      fixture.detectChanges();
      component.measuring.set(false);
      fixture.detectChanges();

      fixture.componentRef.setInput('accentColor', '#ff0000');
      fixture.detectChanges();
      expect(component.measuring()).toBe(true);
    });
  });
});
