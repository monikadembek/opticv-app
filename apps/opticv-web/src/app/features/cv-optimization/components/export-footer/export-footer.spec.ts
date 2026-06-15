import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ExportFooter } from './export-footer';
import { CV_TEMPLATES } from '../../cv-templates';

describe('ExportFooter', () => {
  let fixture: ComponentFixture<ExportFooter>;
  let component: ExportFooter;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportFooter],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportFooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template selector', () => {
    it('renders an option for each CV template', () => {
      const options = fixture.nativeElement.querySelectorAll('select option');
      expect(options.length).toBe(CV_TEMPLATES.length);
    });

    it('displays template names in the select', () => {
      const options = fixture.nativeElement.querySelectorAll('select option');
      CV_TEMPLATES.forEach((t, i) => {
        expect(options[i].textContent.trim()).toBe(t.name);
      });
    });

    it('defaults selectedTemplate to ats', () => {
      expect(component.selectedTemplate()).toBe('ats');
    });

    it('updates selectedTemplate model when select value changes', () => {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
      select.value = 'modern';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(component.selectedTemplate()).toBe('modern');
    });
  });

  describe('export buttons', () => {
    it('emits exportPdf when Export PDF button is clicked', () => {
      const emitSpy = vi.spyOn(component.exportPdf, 'emit');
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const pdfBtn = pBtns.find((b) => b.nativeElement.textContent?.includes('Export PDF'));
      pdfBtn?.triggerEventHandler('onClick');
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('emits exportDocx when Export DOCX button is clicked', () => {
      const emitSpy = vi.spyOn(component.exportDocx, 'emit');
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const docxBtn = pBtns.find((b) => b.nativeElement.textContent?.includes('Export DOCX'));
      docxBtn?.triggerEventHandler('onClick');
      expect(emitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('preview dialog', () => {
    it('previewVisible is false by default', () => {
      expect(component.previewVisible()).toBe(false);
    });

    it('sets previewVisible to true when Preview button is clicked', () => {
      const pBtns = fixture.debugElement.queryAll(By.css('p-button'));
      const previewBtn = pBtns.find((b) => b.nativeElement.textContent?.includes('Preview'));
      previewBtn?.triggerEventHandler('onClick');
      expect(component.previewVisible()).toBe(true);
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
