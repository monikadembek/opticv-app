import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ExportFooter } from './export-footer';
import { CV_ACCENT_COLORS, CV_TEMPLATES } from '../../cv-templates';

describe('ExportFooter', () => {
  let fixture: ComponentFixture<ExportFooter>;
  let component: ExportFooter;

  // CvA4Preview (used inside the preview dialog) uses ResizeObserver which is
  // not available in JSDOM — assign directly to avoid vi.stubGlobal side-effects
  // on other test files sharing the same worker.
  const g = globalThis as Record<string, unknown>;
  const originalResizeObserver = g['ResizeObserver'];

  beforeEach(async () => {
    g['ResizeObserver'] = class {
      observe = vi.fn();
      disconnect = vi.fn();
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ExportFooter],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportFooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    g['ResizeObserver'] = originalResizeObserver;
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('fixed footer bar', () => {
    it('renders exactly two p-button triggers (Preview and Export)', () => {
      const footer = fixture.debugElement.query(By.css('.export-footer'));
      const buttons = footer.queryAll(By.css('p-button'));
      // Each action renders twice (desktop label+icon / mobile icon-only)
      const labels = new Set(
        buttons.map((b) => b.nativeElement.getAttribute('label') || 'icon'),
      );
      expect(buttons.length).toBe(4);
      expect(labels.has('Preview')).toBe(true);
      expect(labels.has('Export')).toBe(true);
    });

    it('does not render the template select, accent select, GDPR checkbox, or ATS info button directly in the footer', () => {
      const footer = fixture.debugElement.query(By.css('.export-footer'));
      expect(footer.query(By.css('p-select'))).toBeFalsy();
      expect(footer.query(By.css('.ats-info-banner'))).toBeFalsy();
      expect(
        footer.query(By.css('input[type="checkbox"]')),
      ).toBeFalsy();
    });
  });

  describe('export dialog', () => {
    it('exportDialogVisible is false by default', () => {
      expect(component.exportDialogVisible()).toBe(false);
    });

    it('sets exportDialogVisible to true when the Export button is clicked', () => {
      const footer = fixture.debugElement.query(By.css('.export-footer'));
      const buttons = footer.queryAll(By.css('p-button'));
      const exportBtn = buttons.find(
        (b) =>
          b.nativeElement.getAttribute('label') === 'Export' ||
          b.nativeElement.textContent?.includes('Export'),
      );
      exportBtn?.triggerEventHandler('onClick', null);
      expect(component.exportDialogVisible()).toBe(true);
    });

    it('closes the export dialog when exportDialogVisible is set to false', () => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
      component.exportDialogVisible.set(false);
      fixture.detectChanges();
      expect(component.exportDialogVisible()).toBe(false);
    });
  });

  describe('template selector (inside export dialog)', () => {
    beforeEach(() => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
    });

    it('exposes all CV templates via the templates computed by default (all tiers allowed)', () => {
      expect(component.templates().length).toBe(CV_TEMPLATES.length);
      expect(component.templates().every((t) => !t.disabled)).toBe(true);
    });

    it('marks templates outside allowedTemplateIds as disabled', () => {
      fixture.componentRef.setInput('allowedTemplateIds', [
        'default',
        'classic',
      ]);
      fixture.detectChanges();

      const disabledIds = component
        .templates()
        .filter((t) => t.disabled)
        .map((t) => t.id);
      expect(disabledIds).toEqual(
        CV_TEMPLATES.filter((t) => !['default', 'classic'].includes(t.id)).map(
          (t) => t.id,
        ),
      );
      expect(
        component.templates().find((t) => t.id === 'default')?.disabled,
      ).toBe(false);
    });

    it('defaults selectedTemplate to default', () => {
      expect(component.selectedTemplate()).toBe('default');
    });

    it('updates selectedTemplate model when set directly', () => {
      component.selectedTemplate.set('modern');
      fixture.detectChanges();
      expect(component.selectedTemplate()).toBe('modern');
    });

    it('renders a p-select for the template', () => {
      const selects = fixture.debugElement.queryAll(By.css('p-select'));
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('accent color selector (inside export dialog)', () => {
    beforeEach(() => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
    });

    it('defaults accentColor to emerald (#059669)', () => {
      expect(component.accentColor()).toBe('#059669');
    });

    it('exposes all accent colors via the accentColors property', () => {
      expect(component.accentColors.length).toBe(CV_ACCENT_COLORS.length);
      expect(component.accentColors).toEqual(CV_ACCENT_COLORS);
    });

    it('renders a p-select for the accent color', () => {
      const selects = fixture.debugElement.queryAll(By.css('p-select'));
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('updates the accentColor model when set directly', () => {
      const blue = CV_ACCENT_COLORS.find((c) => c.id === 'blue')!;
      component.accentColor.set(blue.hex);
      fixture.detectChanges();
      expect(component.accentColor()).toBe('#2563eb');
    });
  });

  describe('ATS info dialog', () => {
    beforeEach(() => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
    });

    it('infoDialogVisible is false by default', () => {
      expect(component.infoDialogVisible()).toBe(false);
    });

    it('opens the dialog when the ATS info button is clicked', () => {
      const infoBtn = fixture.debugElement.query(
        By.css('.ats-info-banner'),
      );
      expect(infoBtn).toBeTruthy();
      infoBtn.nativeElement.click();
      expect(component.infoDialogVisible()).toBe(true);
    });

    it('dialog content includes ATS-related text when visible', () => {
      component.infoDialogVisible.set(true);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Single-column layout');
      expect(text).toContain('Default, Modern, Corporate, and Impact');
    });

    it('closes the dialog when infoDialogVisible is set to false', () => {
      component.infoDialogVisible.set(true);
      fixture.detectChanges();
      component.infoDialogVisible.set(false);
      fixture.detectChanges();
      expect(component.infoDialogVisible()).toBe(false);
    });

    it('keeps the export dialog open when the ATS info dialog is opened', () => {
      component.infoDialogVisible.set(true);
      fixture.detectChanges();
      expect(component.exportDialogVisible()).toBe(true);
    });
  });

  describe('export buttons (inside export dialog)', () => {
    beforeEach(() => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
    });

    it('emits exportPdf when Export PDF button is clicked', () => {
      const emitSpy = vi.spyOn(component.exportPdf, 'emit');
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const pdfBtn = pBtns.find(
        (b) =>
          b.nativeElement.getAttribute('label') === 'Export PDF' ||
          b.nativeElement.textContent?.includes('Export PDF'),
      );
      pdfBtn?.triggerEventHandler('onClick', null);
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('emits exportDocx when Export DOCX button is clicked', () => {
      const emitSpy = vi.spyOn(component.exportDocx, 'emit');
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const docxBtn = pBtns.find(
        (b) =>
          b.nativeElement.getAttribute('label') === 'Export DOCX' ||
          b.nativeElement.textContent?.includes('Export DOCX'),
      );
      docxBtn?.triggerEventHandler('onClick', null);
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('Export PDF button is disabled when isExportingPdf is true', () => {
      fixture.componentRef.setInput('isExportingPdf', true);
      fixture.detectChanges();
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const pdfBtn = pBtns.find(
        (b) => b.nativeElement.getAttribute('label') === 'Export PDF',
      );
      const btn = pdfBtn?.nativeElement.querySelector('button');
      expect(btn?.disabled).toBe(true);
    });

    it('Export DOCX button is disabled when isExportingDocx is true', () => {
      fixture.componentRef.setInput('isExportingDocx', true);
      fixture.detectChanges();
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const docxBtn = pBtns.find(
        (b) => b.nativeElement.getAttribute('label') === 'Export DOCX',
      );
      const btn = docxBtn?.nativeElement.querySelector('button');
      expect(btn?.disabled).toBe(true);
    });
  });

  describe('preview dialog', () => {
    it('previewVisible is false by default', () => {
      expect(component.previewVisible()).toBe(false);
    });

    it('sets previewVisible to true when Preview button is clicked', () => {
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const previewBtn = pBtns.find(
        (b) =>
          b.nativeElement.getAttribute('label') === 'Preview' ||
          b.nativeElement.textContent?.includes('Preview'),
      );
      previewBtn?.triggerEventHandler('onClick', null);
      expect(component.previewVisible()).toBe(true);
    });

    it('closes the preview dialog when previewVisible is set to false', () => {
      component.previewVisible.set(true);
      fixture.detectChanges();
      component.previewVisible.set(false);
      fixture.detectChanges();
      expect(component.previewVisible()).toBe(false);
    });
  });

  describe('GDPR clause checkbox (inside export dialog)', () => {
    beforeEach(() => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
    });

    it('defaults includeGdprClause to false', () => {
      expect(component.includeGdprClause()).toBe(false);
    });

    it('reflects includeGdprClause input as the checkbox checked state', () => {
      fixture.componentRef.setInput('includeGdprClause', true);
      fixture.detectChanges();
      const checkbox = fixture.debugElement.query(
        By.css('input[type="checkbox"][aria-label="Include GDPR clause"]'),
      );
      expect(checkbox.nativeElement.checked).toBe(true);
    });

    it('updates the includeGdprClause model when the checkbox is toggled', () => {
      const checkbox = fixture.debugElement.query(
        By.css('input[type="checkbox"][aria-label="Include GDPR clause"]'),
      );
      checkbox.nativeElement.checked = true;
      checkbox.nativeElement.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(component.includeGdprClause()).toBe(true);
    });

    it('renders the GDPR clause description text', () => {
      const description = fixture.debugElement.query(
        By.css('.gdpr-card-description'),
      );
      expect(description.nativeElement.textContent).toContain(
        "Include if you're applying to companies based in the EU, EEA, UK, or Switzerland",
      );
    });
  });

  describe('collapsed layout', () => {
    it('adds collapsed class to export-footer when sidebarExpanded is false', () => {
      fixture.componentRef.setInput('sidebarExpanded', false);
      fixture.detectChanges();
      const footer = fixture.nativeElement.querySelector('.export-footer');
      expect(footer.classList.contains('collapsed')).toBe(true);
    });

    it('does not add collapsed class when sidebarExpanded is true', () => {
      fixture.componentRef.setInput('sidebarExpanded', true);
      fixture.detectChanges();
      const footer = fixture.nativeElement.querySelector('.export-footer');
      expect(footer.classList.contains('collapsed')).toBe(false);
    });
  });
});
