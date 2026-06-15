import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobInfoBanner } from './job-info-banner';

const mockJobApplication = {
  id: 'job-1',
  userId: 'user-1',
  cvDocumentId: 'cv-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build UIs',
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
});
