import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import type { JobApplicationListItem } from '@opticv/datatypes';
import { OptimizationList } from './optimization-list';
import { CvStore } from '../../../../core/stores/cv.store';

const mockItems: JobApplicationListItem[] = [
  {
    id: 'app-id-1',
    userId: 'user-1',
    cvDocumentId: 'cv-id-1',
    jobTitle: 'Frontend Developer',
    companyName: 'Acme Corp',
    atsScore: 85,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    cvDocument: { id: 'cv-id-1', fileName: 'cv.pdf' },
  },
  {
    id: 'app-id-2',
    userId: 'user-1',
    cvDocumentId: 'cv-id-2',
    jobTitle: 'Backend Engineer',
    companyName: 'Beta Inc',
    atsScore: null,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-02T00:00:00.000Z',
    cvDocument: { id: 'cv-id-2', fileName: 'resume.docx' },
  },
];

describe('OptimizationList', () => {
  let fixture: ComponentFixture<OptimizationList>;
  let component: OptimizationList;
  let cvStore: { hasCv: ReturnType<typeof signal<boolean>> };
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    cvStore = { hasCv: signal(true) };

    await TestBed.configureTestingModule({
      imports: [OptimizationList],
      providers: [{ provide: CvStore, useValue: cvStore }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizationList);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.componentRef.setInput('items', mockItems);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('renders one row per item', () => {
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(mockItems.length);
    });

    it('renders no rows when the list is empty', () => {
      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(0);
    });

    it('shows the error message and a retry button on error', () => {
      fixture.componentRef.setInput('error', 'Load error');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Load error');
      const retryButton = fixture.nativeElement.querySelector(
        'p-button[label="Retry"]',
      );
      expect(retryButton).toBeTruthy();
    });
  });

  describe('loadOptimizations', () => {
    it('emits retryLoadingOptimizations when retry is triggered', () => {
      fixture.componentRef.setInput('error', 'Load error');
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.retryLoadingOptimizations, 'emit');

      component.loadOptimizations();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();
    });

    it('shows "Run your first optimization" when the user has a CV', () => {
      cvStore.hasCv.set(true);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Run your first optimization"]',
      );
      expect(button).toBeTruthy();
    });

    it('shows "Upload your first CV" when the user has no CV', () => {
      cvStore.hasCv.set(false);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'p-button[label="Upload your first CV"]',
      );
      expect(button).toBeTruthy();
    });
  });

  describe('onOpen', () => {
    it('navigates to /cv-optimization/:id', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.onOpen(mockItems[0]);
      expect(navigateSpy).toHaveBeenCalledWith([
        '/cv-optimization',
        mockItems[0].id,
      ]);
    });
  });

  describe('onDelete', () => {
    it('emits deleteOptimizations with the item', () => {
      const emitSpy = vi.spyOn(component.deleteOptimizations, 'emit');

      component.onDelete(mockItems[0]);

      expect(emitSpy).toHaveBeenCalledWith(mockItems[0]);
    });
  });
});
