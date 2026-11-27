import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CvEducationItem } from '@opticv/datatypes';
import { EducationSection } from './education-section';

const mockItem: CvEducationItem = {
  degree: 'B.Sc.',
  institution: 'University',
  location: null,
  startDate: null,
  endDate: null,
  field: null,
};

describe('EducationSection', () => {
  let fixture: ComponentFixture<EducationSection>;
  let component: EducationSection;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducationSection],
    }).compileComponents();

    fixture = TestBed.createComponent(EducationSection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [mockItem]);
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('adds a new empty education item', () => {
    component.addItem();
    expect(component.items().length).toBe(2);
    expect(component.items()[1].degree).toBeNull();
  });

  it('removes an education item by index', () => {
    component.removeItem(0);
    expect(component.items().length).toBe(0);
  });

  it('updates a field on an education item', () => {
    component.updateField(0, 'degree', 'M.Sc.');
    expect(component.items()[0].degree).toBe('M.Sc.');
  });
});
