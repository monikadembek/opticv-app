import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionCard } from './section-card';

describe('SectionCard', () => {
  let fixture: ComponentFixture<SectionCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCard],
    }).compileComponents();
    fixture = TestBed.createComponent(SectionCard);
    fixture.componentRef.setInput('sectionId', 'test');
    fixture.componentRef.setInput('icon', 'pi-chart-bar');
    fixture.componentRef.setInput('title', 'Test Section');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
