import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { NEVER, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import type {
  CvDocumentListItem,
  JobApplicationResponse,
} from '@opticv/datatypes';
import { JobUpload } from './job-upload';
import { CvOptimizationApiService } from '../../services/cv-optimization-api.service';
import { CvStore } from '../../../../core/stores/cv.store';

const mockCv: CvDocumentListItem = {
  id: 'cv-id-1',
  fileName: 'my-cv.pdf',
  fileSize: 2048,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01').toISOString(),
  parsedText: null,
  parseStatus: 'COMPLETED',
};

const mockJobApplicationResponse: JobApplicationResponse = {
  id: 'job-app-id-1',
  userId: 'user-id-1',
  cvDocumentId: 'cv-id-1',
  jobTitle: 'Frontend Developer',
  companyName: 'Acme Corp',
  jobDescription: 'Build amazing UIs',
  atsScore: null,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};

function makeCvStore(overrides: {
  cvList?: CvDocumentListItem[];
  loading?: boolean;
  error?: string | null;
}) {
  return {
    cvList: signal(overrides.cvList ?? [mockCv]),
    loading: signal(overrides.loading ?? false),
    error: signal(overrides.error ?? null),
    loadUserCVs: vi.fn(),
  };
}

describe('JobUpload', () => {
  let fixture: ComponentFixture<JobUpload>;
  let component: JobUpload;
  let apiService: {
    createJobApplication: ReturnType<typeof vi.fn>;
    extractCvData: ReturnType<typeof vi.fn>;
  };
  let cvStore: ReturnType<typeof makeCvStore>;
  let messageService: { add: ReturnType<typeof vi.fn> };

  async function recreateComponent() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [JobUpload],
      providers: [
        { provide: CvOptimizationApiService, useValue: apiService },
        { provide: CvStore, useValue: cvStore },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    apiService = {
      createJobApplication: vi
        .fn()
        .mockReturnValue(of(mockJobApplicationResponse)),
      extractCvData: vi.fn().mockReturnValue(of({ data: {} })),
    };
    cvStore = makeCvStore({});
    messageService = { add: vi.fn() };

    await recreateComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should initialise with an invalid form', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('isSubmitDisabled should be true when form is invalid', () => {
      expect(component.isSubmitDisabled()).toBe(true);
    });

    it('isSubmitDisabled should be false when all required fields are filled', () => {
      component.form.setValue({
        cvDocumentId: 'cv-id-1',
        companyName: 'Acme',
        jobTitle: 'Dev',
        jobDescription: 'Do stuff',
        notes: '',
      });
      expect(component.isSubmitDisabled()).toBe(false);
    });

    it('cvDocumentId should be required', () => {
      component.cvDocumentIdControl.setValue('');
      expect(component.cvDocumentIdControl.hasError('required')).toBe(true);
    });

    it('companyName should be required', () => {
      component.companyNameControl.setValue('');
      expect(component.companyNameControl.hasError('required')).toBe(true);
    });

    it('jobTitle should be required', () => {
      component.jobTitleControl.setValue('');
      expect(component.jobTitleControl.hasError('required')).toBe(true);
    });

    it('jobDescription should be required', () => {
      component.jobDescriptionControl.setValue('');
      expect(component.jobDescriptionControl.hasError('required')).toBe(true);
    });

    it('companyName should have a maxlength of 256', () => {
      component.companyNameControl.setValue('a'.repeat(257));
      expect(component.companyNameControl.hasError('maxlength')).toBe(true);
    });

    it('jobTitle should have a maxlength of 256', () => {
      component.jobTitleControl.setValue('a'.repeat(257));
      expect(component.jobTitleControl.hasError('maxlength')).toBe(true);
    });

    it('jobDescription should have a maxlength of 8000', () => {
      component.jobDescriptionControl.setValue('a'.repeat(8001));
      expect(component.jobDescriptionControl.hasError('maxlength')).toBe(true);
    });

    it('notes should have a maxlength of 1000', () => {
      component.notesControl.setValue('a'.repeat(1001));
      expect(component.notesControl.hasError('maxlength')).toBe(true);
    });

    it('notes is optional — empty value is valid', () => {
      component.form.setValue({
        cvDocumentId: 'cv-id-1',
        companyName: 'Acme',
        jobTitle: 'Dev',
        jobDescription: 'Do stuff',
        notes: '',
      });
      expect(component.form.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    function fillValidForm(): void {
      component.form.setValue({
        cvDocumentId: 'cv-id-1',
        companyName: 'Acme Corp',
        jobTitle: 'Frontend Developer',
        jobDescription: 'Build amazing UIs',
        notes: '',
      });
    }

    it('should not call createJobApplication when form is invalid', () => {
      component.onSubmit();
      expect(apiService.createJobApplication).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when form is invalid on submit', () => {
      component.onSubmit();
      expect(component.form.touched).toBe(true);
    });

    it('should call createJobApplication with form values', () => {
      fillValidForm();
      component.onSubmit();
      expect(apiService.createJobApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          cvDocumentId: 'cv-id-1',
          companyName: 'Acme Corp',
          jobTitle: 'Frontend Developer',
          jobDescription: 'Build amazing UIs',
        }),
      );
    });

    it('should set isSubmitting to true during submission', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValue(NEVER);
      component.onSubmit();
      expect(component.isSubmitting()).toBe(true);
    });

    it('should show a success toast and reset isSubmitting on success', () => {
      fillValidForm();
      component.onSubmit();
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
      expect(component.isSubmitting()).toBe(false);
    });

    it('should set submitError and reset isSubmitting on failure with server message', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } })),
      );
      component.onSubmit();
      expect(component.submitError()).toBe('Server error');
      expect(component.isSubmitting()).toBe(false);
    });

    it('should use fallback error message when error has no message', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValue(throwError(() => ({})));
      component.onSubmit();
      expect(component.submitError()).toBe(
        'Submitting CV and job offer failed',
      );
    });

    it('should clear submitError before each submission attempt', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValueOnce(
        throwError(() => ({ error: { message: 'First error' } })),
      );
      component.onSubmit();
      expect(component.submitError()).toBe('First error');

      apiService.createJobApplication.mockReturnValueOnce(
        of(mockJobApplicationResponse),
      );
      component.onSubmit();
      expect(component.submitError()).toBeNull();
    });

    it('should call extractCvData with the cvDocumentId after successful createJobApplication', () => {
      fillValidForm();
      component.onSubmit();
      expect(apiService.extractCvData).toHaveBeenCalledWith('cv-id-1');
    });

    it('should NOT call extractCvData when createJobApplication fails', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } })),
      );
      component.onSubmit();
      expect(apiService.extractCvData).not.toHaveBeenCalled();
    });

    it('should emit jobSubmitted with the job application after successful extraction', () => {
      fillValidForm();
      const emitted: unknown[] = [];
      component.jobSubmitted.subscribe((v) => emitted.push(v));
      component.onSubmit();
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({
        jobApplication: mockJobApplicationResponse,
        extractedData: {},
      });
    });

    it('should NOT emit jobSubmitted when createJobApplication fails', () => {
      fillValidForm();
      apiService.createJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } })),
      );
      const emitted: unknown[] = [];
      component.jobSubmitted.subscribe((v) => emitted.push(v));
      component.onSubmit();
      expect(emitted).toHaveLength(0);
    });
  });

  describe('preselectedCvId', () => {
    it('patches cvDocumentId when the id is present in cvList', () => {
      fixture.componentRef.setInput('preselectedCvId', mockCv.id);
      fixture.detectChanges();

      expect(component.cvDocumentIdControl.value).toBe(mockCv.id);
    });

    it('leaves cvDocumentId unset when the id is not present in cvList', () => {
      fixture.componentRef.setInput('preselectedCvId', 'nonexistent-id');
      fixture.detectChanges();

      expect(component.cvDocumentIdControl.value).toBe('');
    });

    it('pre-fills reactively once cvList loads after the id is set', async () => {
      cvStore = makeCvStore({ cvList: [] });
      await recreateComponent();

      fixture.componentRef.setInput('preselectedCvId', mockCv.id);
      fixture.detectChanges();
      expect(component.cvDocumentIdControl.value).toBe('');

      cvStore.cvList.set([mockCv]);
      fixture.detectChanges();
      expect(component.cvDocumentIdControl.value).toBe(mockCv.id);
    });

    it('has no effect when left at its default (null)', () => {
      fixture.detectChanges();
      expect(component.cvDocumentIdControl.value).toBe('');
    });
  });

  describe('reloadCvs', () => {
    it('should call loadUserCVs with force on the cv store', () => {
      component.reloadCvs();
      expect(cvStore.loadUserCVs).toHaveBeenCalledWith(true);
    });
  });

  describe('template', () => {
    it('should show a reload button when cvList has an error', async () => {
      cvStore = makeCvStore({ cvList: [], error: 'Network error' });
      await recreateComponent();

      const reloadBtn = fixture.debugElement.query(
        By.css('p-button[label="Reload"]'),
      );
      expect(reloadBtn).toBeTruthy();
    });

    it('should show "No CVs available" message when cv list is empty and not loading', async () => {
      cvStore = makeCvStore({ cvList: [] });
      await recreateComponent();

      const nativeEl: HTMLElement = fixture.nativeElement;
      expect(nativeEl.textContent).toContain('No CVs available');
    });

    it('should show "Loading CV list" placeholder when the store is loading', async () => {
      cvStore = makeCvStore({ cvList: [], loading: true });
      await recreateComponent();

      const nativeEl: HTMLElement = fixture.nativeElement;
      expect(nativeEl.textContent).toContain('Loading CV list');
    });

    it('should show submitError in the template when present', () => {
      component.form.setValue({
        cvDocumentId: 'cv-id-1',
        companyName: 'Acme',
        jobTitle: 'Dev',
        jobDescription: 'Do stuff',
        notes: '',
      });
      apiService.createJobApplication.mockReturnValue(
        throwError(() => ({ error: { message: 'Something went wrong' } })),
      );
      component.onSubmit();
      fixture.detectChanges();

      const alert = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(alert.nativeElement.textContent.trim()).toBe(
        'Something went wrong',
      );
    });
  });
});
