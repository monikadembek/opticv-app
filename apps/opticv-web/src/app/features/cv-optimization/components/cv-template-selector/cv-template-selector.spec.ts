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

  it('defaults selected to default', () => {
    expect(component.selected()).toBe('default');
  });

  it('renders a card for each template', () => {
    const cards = fixture.nativeElement.querySelectorAll('[role="radio"]');
    expect(cards.length).toBe(6);
  });

  it('select() updates the selected signal', () => {
    component.select('modern');
    expect(component.selected()).toBe('modern');
  });

  it('select() called with impact sets selected to impact', () => {
    component.select('impact');
    expect(component.selected()).toBe('impact');
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
    component.openPreview('default', new MouseEvent('click'));
    component.closePreview();
    expect(component.previewVisible()).toBe(false);
  });

  it('templateName returns the correct name for a known id', () => {
    expect(component.templateName('default')).toBe('Default');
    expect(component.templateName('modern')).toBe('Modern');
    expect(component.templateName('classic')).toBe('Classic');
    expect(component.templateName('corporate')).toBe('Corporate');
    expect(component.templateName('minimal')).toBe('Minimal');
    expect(component.templateName('impact')).toBe('Impact');
  });

  it('templateName returns empty string for null', () => {
    expect(component.templateName(null)).toBe('');
  });

  describe('thumbnailColor', () => {
    it('returns the accentColor input for accent-aware templates', () => {
      fixture.componentRef.setInput('accentColor', '#2563eb');
      fixture.detectChanges();
      expect(component.thumbnailColor('default')).toBe('#2563eb');
      expect(component.thumbnailColor('modern')).toBe('#2563eb');
      expect(component.thumbnailColor('corporate')).toBe('#2563eb');
      expect(component.thumbnailColor('impact')).toBe('#2563eb');
    });

    it('returns a fixed neutral color for classic and minimal', () => {
      fixture.componentRef.setInput('accentColor', '#2563eb');
      fixture.detectChanges();
      expect(component.thumbnailColor('classic')).toBe('#94a3b8');
      expect(component.thumbnailColor('minimal')).toBe('#94a3b8');
    });
  });

  describe('onKeydown', () => {
    it('ArrowRight wraps from last to first', () => {
      component.select('impact');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'impact');
      expect(component.selected()).toBe('default');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ArrowLeft wraps from first to last', () => {
      component.select('default');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'default');
      expect(component.selected()).toBe('impact');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ArrowDown moves forward', () => {
      component.select('default');
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'default');
      expect(component.selected()).toBe('classic');
    });

    it('ArrowUp moves backward', () => {
      component.select('classic');
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'classic');
      expect(component.selected()).toBe('default');
    });

    it('Space selects the focused template', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'impact');
      expect(component.selected()).toBe('impact');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('Enter selects the focused template', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');
      component.onKeydown(event, 'modern');
      expect(component.selected()).toBe('modern');
    });

    it('unhandled key does nothing', () => {
      component.select('default');
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      component.onKeydown(event, 'default');
      expect(component.selected()).toBe('default');
    });
  });

  describe('tier gating', () => {
    it('allows all templates by default', () => {
      expect(component.isLocked('modern')).toBe(false);
      expect(component.isLocked('default')).toBe(false);
    });

    it('locks templates outside allowedTemplateIds', () => {
      fixture.componentRef.setInput('allowedTemplateIds', ['default', 'classic']);
      fixture.detectChanges();

      expect(component.isLocked('default')).toBe(false);
      expect(component.isLocked('classic')).toBe(false);
      expect(component.isLocked('modern')).toBe(true);
    });

    it('select() is a no-op for a locked template', () => {
      fixture.componentRef.setInput('allowedTemplateIds', ['default', 'classic']);
      fixture.detectChanges();

      component.select('modern');

      expect(component.selected()).toBe('default');
    });

    it('select() still works for an allowed template', () => {
      fixture.componentRef.setInput('allowedTemplateIds', ['default', 'classic']);
      fixture.detectChanges();

      component.select('classic');

      expect(component.selected()).toBe('classic');
    });

    it('renders aria-disabled on locked template cards', () => {
      fixture.componentRef.setInput('allowedTemplateIds', ['default', 'classic']);
      fixture.detectChanges();

      const modernCard = fixture.nativeElement.querySelector(
        '[data-template-id="modern"]',
      );
      expect(modernCard.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
