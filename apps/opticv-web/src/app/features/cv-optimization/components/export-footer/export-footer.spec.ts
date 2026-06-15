import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportFooter } from './export-footer';

describe('ExportFooter', () => {
  let fixture: ComponentFixture<ExportFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportFooter],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportFooter);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
