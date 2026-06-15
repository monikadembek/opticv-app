import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    expect(fixture.nativeElement.querySelector('.status-completed')).toBeTruthy();
  });

  it('renders processing status badge when status is processing', () => {
    fixture.componentRef.setInput('status', 'processing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Processing');
    expect(fixture.nativeElement.querySelector('.status-processing')).toBeTruthy();
  });

  it('renders error status badge when status is error', () => {
    fixture.componentRef.setInput('status', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Error');
    expect(fixture.nativeElement.querySelector('.status-error')).toBeTruthy();
  });

  it('shows processing placeholder when status is processing', () => {
    fixture.componentRef.setInput('status', 'processing');
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('app-processing-placeholder');
    expect(placeholder).toBeTruthy();
  });

  it('does not render status badge when status is undefined', () => {
    expect(fixture.nativeElement.querySelector('.status-completed')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-processing')).toBeNull();
    expect(fixture.nativeElement.querySelector('.status-error')).toBeNull();
  });

  it('does not render processing placeholder when status is undefined', () => {
    const placeholder = fixture.nativeElement.querySelector('app-processing-placeholder');
    expect(placeholder).toBeNull();
  });

  it('does not render processing placeholder when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('app-processing-placeholder');
    expect(placeholder).toBeNull();
  });
});
