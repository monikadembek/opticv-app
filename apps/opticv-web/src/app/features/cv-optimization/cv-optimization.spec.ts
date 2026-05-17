import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { CvOptimization } from './cv-optimization';
import { CvOptimizationApiService } from './services/cv-optimization-api.service';

describe('CvOptimization', () => {
  let fixture: ComponentFixture<CvOptimization>;
  let component: CvOptimization;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvOptimization],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        CvOptimizationApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvOptimization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the page heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent?.trim()).toBe('CV Optimization');
  });

  it('should render the step1 component inside the stepper', () => {
    const step1 =
      fixture.nativeElement.querySelector('app-cv-optimization-step1');
    expect(step1).toBeTruthy();
  });
});
