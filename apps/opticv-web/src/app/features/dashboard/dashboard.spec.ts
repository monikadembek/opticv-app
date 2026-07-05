import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { CvApiService } from '../../core/services/cv-api.service';
import { JobApplicationApiService } from '../../core/services/job-application-api.service';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        {
          provide: CvApiService,
          useValue: {
            getUserCvs: vi.fn().mockReturnValue(of([])),
            downloadCv: vi.fn().mockReturnValue(of({ url: '' })),
            deleteCv: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        {
          provide: JobApplicationApiService,
          useValue: {
            getJobApplications: vi
              .fn()
              .mockReturnValue(of({ data: [], total: 0 })),
            deleteJobApplication: vi.fn().mockReturnValue(of(undefined)),
          },
        },
        { provide: MessageService, useValue: { add: vi.fn() } },
        ConfirmationService,
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the page heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent?.trim()).toBe('Dashboard');
  });

  it('should render the My CVs tab', () => {
    const tabs = fixture.nativeElement.querySelectorAll('p-tab');
    const labels = Array.from(tabs as NodeListOf<Element>).map((t) =>
      t.textContent?.trim(),
    );
    expect(labels).toContain('My CVs');
  });

  it('should render the My Optimizations tab', () => {
    const tabs = fixture.nativeElement.querySelectorAll('p-tab');
    const labels = Array.from(tabs as NodeListOf<Element>).map((t) =>
      t.textContent?.trim(),
    );
    expect(labels).toContain('My Optimizations');
  });

  it('should include the cv-file-list component', () => {
    const el = fixture.nativeElement.querySelector('app-cv-file-list');
    expect(el).toBeTruthy();
  });

  it('should include the optimization-list component', () => {
    const el = fixture.nativeElement.querySelector('app-optimization-list');
    expect(el).toBeTruthy();
  });
});
