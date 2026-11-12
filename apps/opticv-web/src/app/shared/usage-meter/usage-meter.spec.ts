import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UsageMeter } from './usage-meter';

describe('UsageMeter', () => {
  let fixture: ComponentFixture<UsageMeter>;

  function render(inputs: Record<string, unknown>) {
    fixture = TestBed.createComponent(UsageMeter);
    fixture.componentRef.setInput('label', 'optimizations used');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function upgradeLink(el: HTMLElement): HTMLAnchorElement | null {
    return el.querySelector('a[href="/pricing"]');
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UsageMeter],
      providers: [provideRouter([{ path: 'pricing', children: [] }])],
    }).compileComponents();
  });

  it('renders the usage summary', () => {
    const el = render({ used: 2, limit: 10 });
    expect(el.textContent).toContain('2 of 10 optimizations used');
  });

  it('labels the progress bar with the summary', () => {
    const el = render({ used: 2, limit: 10 });
    const bar = el.querySelector('p-progressbar');
    expect(bar?.getAttribute('aria-label')).toBe('2 of 10 optimizations used');
    expect(bar?.getAttribute('aria-valuenow')).toBe('20');
  });

  it('states when the limit is reached', () => {
    const el = render({ used: 1, limit: 1 });
    expect(el.textContent).toContain('Limit reached');
  });

  it('does not state limit reached below the limit', () => {
    const el = render({ used: 8, limit: 10 });
    expect(el.textContent).not.toContain('Limit reached');
  });

  it('hides the upgrade link below 80% usage', () => {
    const el = render({ used: 7, limit: 10 });
    expect(upgradeLink(el)).toBeNull();
  });

  it('shows the upgrade link at 80% usage', () => {
    const el = render({ used: 8, limit: 10 });
    expect(upgradeLink(el)?.textContent?.trim()).toBe('Upgrade');
  });

  it('hides the upgrade link when the user cannot upgrade', () => {
    const el = render({ used: 10, limit: 10, canUpgrade: false });
    expect(upgradeLink(el)).toBeNull();
  });

  it('shows the reset date with its label', () => {
    const el = render({
      used: 2,
      limit: 10,
      resetLabel: 'Resets',
      resetsAt: '2026-12-01T12:00:00.000Z',
    });
    expect(el.textContent).toContain('Resets Dec 1, 2026');
  });

  it('hides the reset date when it is null', () => {
    const el = render({ used: 2, limit: 10, resetLabel: 'Resets' });
    expect(el.textContent).not.toContain('Resets');
  });

  it('emits upgradeClicked when the upgrade link is clicked', () => {
    const el = render({ used: 1, limit: 1 });
    const spy = vi.fn();
    fixture.componentInstance.upgradeClicked.subscribe(spy);

    upgradeLink(el)?.click();

    expect(spy).toHaveBeenCalledOnce();
  });
});
