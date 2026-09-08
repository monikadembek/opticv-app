import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CvExperienceItem } from '@opticv/datatypes';
import { ExperienceSection } from './experience-section';

const mockItem: CvExperienceItem = {
  title: 'Engineer',
  company: 'Acme',
  location: null,
  startDate: null,
  endDate: null,
  current: false,
  bullets: ['Did a thing'],
};

describe('ExperienceSection', () => {
  let fixture: ComponentFixture<ExperienceSection>;
  let component: ExperienceSection;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienceSection],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperienceSection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [mockItem]);
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('adds a new empty experience item', () => {
    component.addItem();
    expect(component.items().length).toBe(2);
    expect(component.items()[1].title).toBeNull();
  });

  it('removes an experience item by index', () => {
    component.removeItem(0);
    expect(component.items().length).toBe(0);
  });

  it('updates a field on an experience item', () => {
    component.updateField(0, 'title', 'Senior Engineer');
    expect(component.items()[0].title).toBe('Senior Engineer');
  });

  it('adds a bullet to an experience item', () => {
    component.addBullet(0);
    expect(component.items()[0].bullets.length).toBe(2);
  });

  it('updates a bullet', () => {
    component.updateBullet(0, 0, 'Updated bullet');
    expect(component.items()[0].bullets[0]).toBe('Updated bullet');
  });

  it('removes a bullet', () => {
    component.removeBullet(0, 0);
    expect(component.items()[0].bullets.length).toBe(0);
  });

  describe('when bullets is missing on the item (malformed/legacy data)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('items', [
        { ...mockItem, bullets: undefined } as unknown as CvExperienceItem,
      ]);
      fixture.detectChanges();
    });

    it('addBullet does not throw and results in a single bullet', () => {
      expect(() => component.addBullet(0)).not.toThrow();
      expect(component.items()[0].bullets).toEqual(['']);
    });

    it('updateBullet does not throw', () => {
      expect(() => component.updateBullet(0, 0, 'text')).not.toThrow();
    });

    it('removeBullet does not throw', () => {
      expect(() => component.removeBullet(0, 0)).not.toThrow();
    });
  });
});
