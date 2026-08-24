import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SectionCard } from './section-card';

describe('SectionCard', () => {
  let fixture: ComponentFixture<SectionCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCard],
    }).compileComponents();
    fixture = TestBed.createComponent(SectionCard);
    fixture.componentRef.setInput('sectionId', 'test-section');
    fixture.componentRef.setInput('icon', 'pi-chart-bar');
    fixture.componentRef.setInput('title', 'Test Section');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the section title', () => {
    const title = fixture.nativeElement.querySelector('h2');
    expect(title.textContent.trim()).toBe('Test Section');
  });

  it('sets id and data-section attributes from sectionId input', () => {
    const card = fixture.nativeElement.querySelector('[data-section]');
    expect(card.id).toBe('section-test-section');
    expect(card.getAttribute('data-section')).toBe('test-section');
  });

  it('renders the icon class', () => {
    const icon = fixture.nativeElement.querySelector('.pi-chart-bar');
    expect(icon).toBeTruthy();
  });

  it('renders completed status badge when status is completed', () => {
    fixture.componentRef.setInput('status', 'completed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Completed');
    expect(
      fixture.nativeElement.querySelector('.status-completed'),
    ).toBeTruthy();
  });

  it('renders processing status badge when status is processing', () => {
    fixture.componentRef.setInput('status', 'processing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Processing');
    expect(
      fixture.nativeElement.querySelector('.status-processing'),
    ).toBeTruthy();
  });

  it('renders error status badge when status is error', () => {
    fixture.componentRef.setInput('status', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Error');
    expect(fixture.nativeElement.querySelector('.status-error')).toBeTruthy();
  });

  it('renders not-started status badge when status is not-started', () => {
    fixture.componentRef.setInput('status', 'not-started');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not started');
    expect(
      fixture.nativeElement.querySelector('.status-not-started'),
    ).toBeTruthy();
  });

  it('projects content in the body when status is not-started', () => {
    fixture.componentRef.setInput('status', 'not-started');
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector(
      'app-processing-placeholder',
    );
    expect(placeholder).toBeNull();
    const body = fixture.nativeElement.querySelector('.section-card__body');
    expect(body.hasAttribute('hidden')).toBe(false);
  });

  it('shows processing placeholder when status is processing', () => {
    fixture.componentRef.setInput('status', 'processing');
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector(
      'app-processing-placeholder',
    );
    expect(placeholder).toBeTruthy();
  });

  it('does not render status badge when status is undefined', () => {
    expect(fixture.nativeElement.querySelector('.status-completed')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.status-processing'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-error')).toBeNull();
  });

  it('does not render processing placeholder when status is undefined', () => {
    const placeholder = fixture.nativeElement.querySelector(
      'app-processing-placeholder',
    );
    expect(placeholder).toBeNull();
  });

  it('does not render processing placeholder when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector(
      'app-processing-placeholder',
    );
    expect(placeholder).toBeNull();
  });

  it('renders the toggle button expanded by default', () => {
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('has an accessible name that includes the section title', () => {
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    expect(toggle.getAttribute('aria-label')).toContain('Test Section');
  });

  it('collapses the body and updates aria-expanded when the toggle is clicked', () => {
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const body = fixture.nativeElement.querySelector('.section-card__body');
    expect(body.hasAttribute('hidden')).toBe(true);
  });

  it('expands the body again when the toggle is clicked twice', () => {
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    toggle.click();
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const body = fixture.nativeElement.querySelector('.section-card__body');
    expect(body.hasAttribute('hidden')).toBe(false);
  });

  it('collapses when the collapsed input is set externally', () => {
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const body = fixture.nativeElement.querySelector('.section-card__body');
    expect(body.hasAttribute('hidden')).toBe(true);
  });

  it('does not render a help button when helpTitle is not set', () => {
    fixture.detectChanges();
    const helpButton = fixture.debugElement.query(
      By.css('.section-card__help-button'),
    );
    expect(helpButton).toBeNull();
  });

  it('does not render a help dialog when helpTitle is not set', () => {
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.css('p-dialog'));
    expect(dialog).toBeNull();
  });

  it('renders a help button when helpTitle is set', () => {
    fixture.componentRef.setInput('helpTitle', 'About Test Section');
    fixture.detectChanges();
    const helpButton = fixture.debugElement.query(
      By.css('.section-card__help-button'),
    );
    expect(helpButton).toBeTruthy();
  });

  it('has a help button accessible name distinct from the collapse toggle', () => {
    fixture.componentRef.setInput('helpTitle', 'About Test Section');
    fixture.detectChanges();
    const helpButton = fixture.debugElement.query(
      By.css('.section-card__help-button'),
    );
    const toggle = fixture.nativeElement.querySelector('.section-card__toggle');
    expect(helpButton.nativeElement.getAttribute('aria-label')).toBe(
      'About Test Section section',
    );
    expect(helpButton.nativeElement.getAttribute('aria-label')).not.toBe(
      toggle.getAttribute('aria-label'),
    );
  });

  it('opens the help dialog when the help button is clicked', () => {
    fixture.componentRef.setInput('helpTitle', 'About Test Section');
    fixture.detectChanges();
    expect(fixture.componentInstance.helpDialogVisible()).toBe(false);
    const helpButton = fixture.debugElement.query(
      By.css('.section-card__help-button'),
    );
    helpButton.triggerEventHandler('click');
    fixture.detectChanges();
    expect(fixture.componentInstance.helpDialogVisible()).toBe(true);
  });

  it('keeps the help button visible when the section is collapsed', () => {
    fixture.componentRef.setInput('helpTitle', 'About Test Section');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    const helpButton = fixture.debugElement.query(
      By.css('.section-card__help-button'),
    );
    expect(helpButton).toBeTruthy();
  });
});
