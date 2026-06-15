import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessingPlaceholder } from './processing-placeholder';

describe('ProcessingPlaceholder', () => {
  let fixture: ComponentFixture<ProcessingPlaceholder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessingPlaceholder],
    }).compileComponents();
    fixture = TestBed.createComponent(ProcessingPlaceholder);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders spinner icon', () => {
    const spinner = fixture.nativeElement.querySelector('.pi-spinner');
    expect(spinner).toBeTruthy();
  });

  it('displays analyzing text', () => {
    expect(fixture.nativeElement.textContent).toContain('Analyzing your resume');
  });

  it('renders three skeleton elements', () => {
    const skeletons = fixture.nativeElement.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(3);
  });
});
