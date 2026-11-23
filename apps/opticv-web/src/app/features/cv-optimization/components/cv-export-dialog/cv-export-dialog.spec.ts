import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { vi } from 'vitest';
import { CvExportDialog } from './cv-export-dialog';
import { CV_ACCENT_COLORS, CV_TEMPLATES } from '../../cv-templates';

describe('CvExportDialog', () => {
  let fixture: ComponentFixture<CvExportDialog>;
  let component: CvExportDialog;

  function findButton(label: string): DebugElement | undefined {
    return fixture.debugElement
      .queryAll(By.css('p-button'))
      .find((b) => b.nativeElement.getAttribute('label') === label);
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CvExportDialog],
    }).compileComponents();
    fixture = TestBed.createComponent(CvExportDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('visibility', () => {
    it('renders the export dialog content when visible', () => {
      expect(
        fixture.nativeElement.querySelector('.export-dialog-content'),
      ).toBeTruthy();
    });

    it('defaults visible to false', () => {
      const fresh = TestBed.createComponent(CvExportDialog);
      expect(fresh.componentInstance.visible()).toBe(false);
    });

    it('sets visible to false when the dialog emits visibleChange(false)', () => {
      const dialogs = fixture.debugElement.queryAll(By.css('p-dialog'));
      dialogs[0].triggerEventHandler('visibleChange', false);
      expect(component.visible()).toBe(false);
    });
  });

  describe('template select', () => {
    it('exposes all CV templates enabled by default', () => {
      expect(component.templates().length).toBe(CV_TEMPLATES.length);
      expect(component.templates().every((t) => !t.disabled)).toBe(true);
    });

    it('disables and labels templates outside allowedTemplateIds', () => {
      fixture.componentRef.setInput('allowedTemplateIds', [
        'default',
        'classic',
      ]);
      fixture.detectChanges();

      const disabled = component.templates().filter((t) => t.disabled);
      expect(disabled.map((t) => t.id)).toEqual(
        CV_TEMPLATES.filter((t) => !['default', 'classic'].includes(t.id)).map(
          (t) => t.id,
        ),
      );
      expect(
        disabled.every((t) => t.name.endsWith('(Upgrade to unlock)')),
      ).toBe(true);
      expect(component.templates().find((t) => t.id === 'default')?.name).toBe(
        'Default',
      );
    });

    it('defaults selectedTemplate to default and updates the model', () => {
      expect(component.selectedTemplate()).toBe('default');
      component.selectedTemplate.set('modern');
      expect(component.selectedTemplate()).toBe('modern');
    });

    it('renders the template p-select', () => {
      expect(
        fixture.debugElement.query(
          By.css('p-select[inputId="export-template-select"]'),
        ),
      ).toBeTruthy();
    });
  });

  describe('accent color select', () => {
    it('defaults accentColor to emerald (#059669)', () => {
      expect(component.accentColor()).toBe('#059669');
    });

    it('exposes all accent colors', () => {
      expect(component.accentColors).toEqual(CV_ACCENT_COLORS);
    });

    it('disables the accent select for non accent-aware templates', () => {
      component.selectedTemplate.set('classic');
      expect(component.accentColorDisabled()).toBe(true);
      component.selectedTemplate.set('minimal');
      expect(component.accentColorDisabled()).toBe(true);
      component.selectedTemplate.set('modern');
      expect(component.accentColorDisabled()).toBe(false);
    });

    it('updates the accentColor model', () => {
      component.accentColor.set('#2563eb');
      expect(component.accentColor()).toBe('#2563eb');
    });
  });

  describe('ATS info dialog', () => {
    it('is hidden by default', () => {
      expect(component.infoDialogVisible()).toBe(false);
    });

    it('opens when the ATS info banner is clicked and keeps the export dialog open', () => {
      fixture.nativeElement.querySelector('.ats-info-banner').click();
      expect(component.infoDialogVisible()).toBe(true);
      expect(component.visible()).toBe(true);
    });

    it('shows ATS content when visible', () => {
      component.infoDialogVisible.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Single-column layout');
      expect(text).toContain('Default, Modern, Corporate, and Impact');
    });

    it('closes', () => {
      component.infoDialogVisible.set(true);
      fixture.detectChanges();
      component.infoDialogVisible.set(false);
      fixture.detectChanges();
      expect(component.infoDialogVisible()).toBe(false);
    });
  });

  describe('compliance section', () => {
    const checkboxSelector =
      'input[type="checkbox"][aria-label="Include GDPR clause"]';

    it('renders the GDPR checkbox by default', () => {
      expect(
        fixture.nativeElement.querySelector(checkboxSelector),
      ).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Compliance');
    });

    it('updates includeGdprClause when the checkbox is toggled', () => {
      const checkbox = fixture.nativeElement.querySelector(checkboxSelector);
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(component.includeGdprClause()).toBe(true);
    });

    it('reflects includeGdprClause in the checkbox', () => {
      fixture.componentRef.setInput('includeGdprClause', true);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector(checkboxSelector).checked,
      ).toBe(true);
    });

    it('does not render the compliance section when showCompliance is false', () => {
      fixture.componentRef.setInput('showCompliance', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(checkboxSelector)).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Compliance');
    });
  });

  describe('export buttons', () => {
    it('emits exportPdf when Export PDF is clicked', () => {
      const spy = vi.spyOn(component.exportPdf, 'emit');
      findButton('Export PDF')?.triggerEventHandler('onClick', null);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('emits exportDocx when Export DOCX is clicked', () => {
      const spy = vi.spyOn(component.exportDocx, 'emit');
      findButton('Export DOCX')?.triggerEventHandler('onClick', null);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('disables Export PDF while isExportingPdf is true', () => {
      fixture.componentRef.setInput('isExportingPdf', true);
      fixture.detectChanges();
      const btn =
        findButton('Export PDF')?.nativeElement.querySelector('button');
      expect(btn?.disabled).toBe(true);
    });

    it('disables Export DOCX while isExportingDocx is true', () => {
      fixture.componentRef.setInput('isExportingDocx', true);
      fixture.detectChanges();
      const btn =
        findButton('Export DOCX')?.nativeElement.querySelector('button');
      expect(btn?.disabled).toBe(true);
    });

    it('uses generic aria labels', () => {
      expect(
        fixture.nativeElement.querySelector('[aria-label="Export CV to PDF"]'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('[aria-label="Export CV to DOCX"]'),
      ).toBeTruthy();
    });
  });
});
