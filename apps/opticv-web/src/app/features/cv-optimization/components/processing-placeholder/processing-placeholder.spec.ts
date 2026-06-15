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
});
