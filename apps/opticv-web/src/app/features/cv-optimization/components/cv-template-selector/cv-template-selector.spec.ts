import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CvTemplateSelector } from './cv-template-selector';
import { MessageService } from 'primeng/api';

describe('CvTemplateSelector', () => {
  let fixture: ComponentFixture<CvTemplateSelector>;
  let component: CvTemplateSelector;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CvTemplateSelector],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(CvTemplateSelector);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mergedCv', null);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults selected to ats', () => {
    expect(component.selected()).toBe('ats');
  });

  it('renders a card for each template', () => {
    const cards = fixture.nativeElement.querySelectorAll('[role="radio"]');
    expect(cards.length).toBe(3);
  });

  it('select() updates the selected signal', () => {
    component.select('modern');
    expect(component.selected()).toBe('modern');
  });

  it('select() called with executive sets selected to executive', () => {
    component.select('executive');
    expect(component.selected()).toBe('executive');
  });

  it('openPreview() sets previewTemplateId and previewVisible', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');

    component.openPreview('modern', event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.previewTemplateId()).toBe('modern');
    expect(component.previewVisible()).toBe(true);
  });

  it('closePreview() sets previewVisible to false', () => {
    component.openPreview('ats', new MouseEvent('click'));
    component.closePreview();
    expect(component.previewVisible()).toBe(false);
  });

  it('templateName returns the correct name for a known id', () => {
    expect(component.templateName('ats')).toBe('Default');
    expect(component.templateName('modern')).toBe('Modern');
    expect(component.templateName('executive')).toBe('Executive');
  });

  it('templateName returns empty string for null', () => {
    expect(component.templateName(null)).toBe('');
  });

  describe('onKeydown', () => {
    it('ArrowRight wraps from last to first', () => {
      component.select('executive');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'executive');
      expect(component.selected()).toBe('ats');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ArrowLeft wraps from first to last', () => {
      component.select('ats');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'ats');
      expect(component.selected()).toBe('executive');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ArrowDown moves forward', () => {
      component.select('ats');
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'ats');
      expect(component.selected()).toBe('modern');
    });

    it('ArrowUp moves backward', () => {
      component.select('modern');
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'modern');
      expect(component.selected()).toBe('ats');
    });

    it('Space selects the focused template', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'executive');
      expect(component.selected()).toBe('executive');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('Enter selects the focused template', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'modern');
      expect(component.selected()).toBe('modern');
    });

    it('unhandled key does nothing', () => {
      component.select('ats');
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      component.onKeydown(event, 'ats');
      expect(component.selected()).toBe('ats');
    });
  });
});
