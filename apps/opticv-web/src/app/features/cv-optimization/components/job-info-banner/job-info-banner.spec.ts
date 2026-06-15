import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { JobInfoBanner } from './job-info-banner';

const mockJobApplication = {
  id: 'job-1',
  userId: 'user-1',
  cvDocumentId: 'cv-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build amazing UIs with Angular.',
  atsScore: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  cvDocument: { id: 'cv-1', fileName: 'my-cv.pdf' },
};

describe('JobInfoBanner', () => {
  let fixture: ComponentFixture<JobInfoBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobInfoBanner],
    }).compileComponents();
    fixture = TestBed.createComponent(JobInfoBanner);
    fixture.componentRef.setInput('jobApplication', mockJobApplication);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('displays the job title', () => {
    expect(fixture.nativeElement.textContent).toContain('Frontend Developer');
  });

  it('displays the company name', () => {
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('renders cv file button with fileName', () => {
    const btn = fixture.nativeElement.querySelector('.job-banner-cv-btn');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('my-cv.pdf');
  });

  it('emits openCv output when cv button is clicked', () => {
    const emitSpy = vi.spyOn(fixture.componentInstance.openCv, 'emit');
    const btn = fixture.debugElement.query(By.css('.job-banner-cv-btn'));
    btn.triggerEventHandler('click');
    expect(emitSpy).toHaveBeenCalledOnce();
  });

  it('hides job description by default', () => {
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeNull();
  });

  it('shows "View job description" toggle button initially', () => {
    expect(fixture.nativeElement.textContent).toContain('View job description');
  });

  it('shows job description after toggle button click', () => {
    fixture.nativeElement.querySelector('.job-banner-toggle-btn').click();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.textContent.trim()).toContain('Build amazing UIs with Angular.');
  });

  it('shows "Hide job description" after toggling open', () => {
    fixture.nativeElement.querySelector('.job-banner-toggle-btn').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hide job description');
  });

  it('hides job description after toggling twice', () => {
    const btn = fixture.nativeElement.querySelector('.job-banner-toggle-btn');
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
  });

  it('does not render cv button when fileName is empty', () => {
    fixture.componentRef.setInput('jobApplication', {
      ...mockJobApplication,
      cvDocument: { id: 'cv-1', fileName: '' },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.job-banner-cv-btn')).toBeNull();
  });

  it('sets section-JOB_POSTING id on root element', () => {
    const root = fixture.nativeElement.querySelector('[data-section="JOB_POSTING"]');
    expect(root).toBeTruthy();
    expect(root.id).toBe('section-JOB_POSTING');
  });
});
