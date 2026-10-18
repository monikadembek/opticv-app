import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CookieConsentStore } from '../../core/stores/cookie-consent.store';
import { CookieConsentBanner } from './cookie-consent-banner';

describe('CookieConsentBanner', () => {
  let fixture: ComponentFixture<CookieConsentBanner>;
  let store: InstanceType<typeof CookieConsentStore>;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CookieConsentBanner],
      providers: [provideRouter([])],
    }).compileComponents();

    store = TestBed.inject(CookieConsentStore);
    fixture = TestBed.createComponent(CookieConsentBanner);
  });

  afterEach(() => {
    document.body.querySelectorAll('[data-test-trigger]').forEach((el) => {
      el.remove();
    });
  });

  async function render() {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function banner() {
    return fixture.debugElement.query(By.css('section[role="region"]'));
  }

  function button(label: string): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const match = buttons.find((b) => b.textContent?.trim() === label);
    if (!match) throw new Error(`Button "${label}" not found`);
    return match;
  }

  it('does not render before the first client render', () => {
    expect(fixture.componentInstance.isVisible()).toBe(false);
  });

  it('renders when no decision has been made', async () => {
    await render();

    const region = banner();
    expect(region).toBeTruthy();
    expect(region.attributes['aria-label']).toBe('Cookie consent');
  });

  it('links to the cookies section of the privacy policy', async () => {
    await render();

    const link = fixture.debugElement.query(
      By.css('a[href="/privacy-policy#cookies"]'),
    );
    expect(link).toBeTruthy();
  });

  it('is hidden when a decision has been made', async () => {
    store.reject();
    await render();

    expect(banner()).toBeNull();
  });

  it('is shown again after reopenBanner()', async () => {
    store.reject();
    await render();

    store.reopenBanner();
    await render();

    expect(banner()).toBeTruthy();
  });

  it('accepts and hides the banner when Accept is clicked', async () => {
    await render();

    button('Accept').click();
    await render();

    expect(store.status()).toBe('accepted');
    expect(banner()).toBeNull();
  });

  it('rejects and hides the banner when Reject is clicked', async () => {
    await render();

    button('Reject').click();
    await render();

    expect(store.status()).toBe('rejected');
    expect(banner()).toBeNull();
  });

  it('moves focus into the banner when reopened and returns it after a choice', async () => {
    store.accept();
    await render();

    const trigger = document.createElement('button');
    trigger.setAttribute('data-test-trigger', '');
    document.body.appendChild(trigger);
    trigger.focus();

    store.reopenBanner();
    await render();

    const link = fixture.debugElement.query(
      By.css('a[href="/privacy-policy#cookies"]'),
    ).nativeElement;
    expect(document.activeElement).toBe(link);

    button('Reject').click();
    await render();

    expect(document.activeElement).toBe(trigger);
  });
});
