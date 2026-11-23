import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ExportFooter } from './export-footer';
import { CvExportDialog } from '../cv-export-dialog/cv-export-dialog';

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
        buttons.map((b) => b.nativeElement.getAttribute('label')),
      );
      expect(buttons.length).toBe(2);
      expect(labels.has('Preview')).toBe(true);
      expect(labels.has('Export CV')).toBe(true);
    });

    it('does not render the template select, accent select, GDPR checkbox, or ATS info button directly in the footer', () => {
      const footer = fixture.debugElement.query(By.css('.export-footer'));
      expect(footer.query(By.css('p-select'))).toBeFalsy();
      expect(footer.query(By.css('.ats-info-banner'))).toBeFalsy();
      expect(footer.query(By.css('input[type="checkbox"]'))).toBeFalsy();
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

  describe('shared export dialog', () => {
    function dialog(): CvExportDialog {
      return fixture.debugElement.query(By.directive(CvExportDialog))
        .componentInstance;
    }

    it('renders app-cv-export-dialog with the compliance section enabled', () => {
      expect(dialog()).toBeTruthy();
      expect(dialog().showCompliance()).toBe(true);
    });

    it('mirrors footer inputs into the dialog', () => {
      fixture.componentRef.setInput('allowedTemplateIds', [
        'default',
        'classic',
      ]);
      fixture.componentRef.setInput('selectedTemplate', 'classic');
      fixture.componentRef.setInput('accentColor', '#2563eb');
      fixture.componentRef.setInput('includeGdprClause', true);
      fixture.componentRef.setInput('isExportingPdf', true);
      fixture.componentRef.setInput('isExportingDocx', true);
      fixture.detectChanges();

      expect(dialog().allowedTemplateIds()).toEqual(['default', 'classic']);
      expect(dialog().selectedTemplate()).toBe('classic');
      expect(dialog().accentColor()).toBe('#2563eb');
      expect(dialog().includeGdprClause()).toBe(true);
      expect(dialog().isExportingPdf()).toBe(true);
      expect(dialog().isExportingDocx()).toBe(true);
    });

    it('opens the dialog when exportDialogVisible is set', () => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
      expect(dialog().visible()).toBe(true);
    });

    it('propagates dialog model changes back to the footer', () => {
      dialog().selectedTemplate.set('modern');
      dialog().accentColor.set('#7c3aed');
      dialog().includeGdprClause.set(true);
      fixture.detectChanges();
      expect(component.selectedTemplate()).toBe('modern');
      expect(component.accentColor()).toBe('#7c3aed');
      expect(component.includeGdprClause()).toBe(true);
    });

    it('sets exportDialogVisible to false when the dialog closes', () => {
      component.exportDialogVisible.set(true);
      fixture.detectChanges();
      dialog().visible.set(false);
      fixture.detectChanges();
      expect(component.exportDialogVisible()).toBe(false);
    });

    it('re-emits exportPdf and exportDocx from the dialog', () => {
      const pdfSpy = vi.spyOn(component.exportPdf, 'emit');
      const docxSpy = vi.spyOn(component.exportDocx, 'emit');
      dialog().exportPdf.emit();
      dialog().exportDocx.emit();
      expect(pdfSpy).toHaveBeenCalledOnce();
      expect(docxSpy).toHaveBeenCalledOnce();
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
