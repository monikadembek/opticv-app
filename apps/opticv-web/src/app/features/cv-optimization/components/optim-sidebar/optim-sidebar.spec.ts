import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OptimSidebar } from './optim-sidebar';

describe('OptimSidebar', () => {
  let fixture: ComponentFixture<OptimSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptimSidebar],
    }).compileComponents();
    fixture = TestBed.createComponent(OptimSidebar);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
