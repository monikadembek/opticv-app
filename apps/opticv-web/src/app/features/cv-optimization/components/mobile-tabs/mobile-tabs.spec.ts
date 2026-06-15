import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileTabs } from './mobile-tabs';

describe('MobileTabs', () => {
  let fixture: ComponentFixture<MobileTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileTabs],
    }).compileComponents();
    fixture = TestBed.createComponent(MobileTabs);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
