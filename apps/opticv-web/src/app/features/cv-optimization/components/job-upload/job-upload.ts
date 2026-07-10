import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Button } from 'primeng/button';
import {
  CreateJobApplicationPayload,
  CvOptimizationApiService,
} from '../../services/cv-optimization-api.service';
import { MessageService } from 'primeng/api';
import { catchError, EMPTY, retry, switchMap, tap } from 'rxjs';
import {
  CvStructuredData,
  JobApplication,
  JobApplicationResponse,
} from '@opticv/datatypes';
import posthog from 'posthog-js';
import { CvStore } from '../../../../core/stores/cv.store';

export interface JobSubmittedData {
  jobApplication: JobApplication;
  extractedData: CvStructuredData;
}

@Component({
  selector: 'app-job-upload',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Select,
    InputText,
    Textarea,
    Button,
  ],
  templateUrl: './job-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobUpload {
  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  readonly cvStore = inject(CvStore);

  isReadonly = input<boolean>(false);
  prefillData = input<JobApplication | null>(null);
  preselectedCvId = input<string | null>(null);

  jobSubmitted = output<JobSubmittedData>();
  jobApplication: JobApplicationResponse | null = null;

  cvList = this.cvStore.cvList;
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  form = this.fb.group({
    cvDocumentId: ['', [Validators.required]],
    companyName: ['', [Validators.required, Validators.maxLength(256)]],
    jobTitle: ['', [Validators.required, Validators.maxLength(256)]],
    jobDescription: ['', [Validators.required, Validators.maxLength(8000)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  isSubmitDisabled = computed(() => this.form.invalid || this.isSubmitting());

  get cvDocumentIdControl() {
    return this.form.controls.cvDocumentId;
  }

  get companyNameControl() {
    return this.form.controls.companyName;
  }

  get jobTitleControl() {
    return this.form.controls.jobTitle;
  }

  get jobDescriptionControl() {
    return this.form.controls.jobDescription;
  }

  get notesControl() {
    return this.form.controls.notes;
  }

  constructor() {
    effect(() => {
      const data = this.prefillData();
      if (data) {
        this.form.patchValue({
          cvDocumentId: data.cvDocumentId,
          companyName: data.companyName ?? '',
          jobTitle: data.jobTitle ?? '',
          jobDescription: data.jobDescription,
          notes: data.notes ?? '',
        });
      }

      if (this.isReadonly()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });

    effect(() => {
      const cvId = this.preselectedCvId();
      if (!cvId) return;
      const cvExists = this.cvStore.cvList().some((cv) => cv.id === cvId);
      if (cvExists) {
        this.form.controls.cvDocumentId.setValue(cvId);
      }
    });
  }

  reloadCvs(): void {
    this.cvStore.loadUserCVs(true);
  }

  onSubmit(): void {
    if (this.isSubmitDisabled()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    let payload: CreateJobApplicationPayload | null = null;
    const { cvDocumentId, companyName, jobTitle, jobDescription, notes } =
      this.form.getRawValue();

    if (cvDocumentId && companyName && jobTitle && jobDescription) {
      payload = {
        cvDocumentId,
        companyName,
        jobTitle,
        jobDescription,
        notes: notes || undefined,
      };
    }

    if (!payload) return;

    posthog.capture('start_optimization_process_button_clicked', {
      page: 'cv_optimization',
      button_title: 'Start Optimization Process',
    });

    this.cvOptimizationApiService
      .createJobApplication(payload)
      .pipe(
        catchError((err) => {
          const errorMsg =
            err?.error?.message ?? 'Submitting CV and job offer failed';
          this.submitError.set(errorMsg);
          this.isSubmitting.set(false);
          return EMPTY;
        }),
        tap((result: JobApplicationResponse) => {
          console.log('submit job description result: ', result);
          this.jobApplication = result;
        }),
        switchMap(() => {
          return this.cvOptimizationApiService
            .extractCvData(cvDocumentId as string)
            .pipe(retry(2));
        }),
      )
      .subscribe({
        next: (extractedData) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'CV and job description were successfully submitted',
          });
          this.isSubmitting.set(false);
          console.log('extraced data from cv: ', extractedData);
          if (this.jobApplication) {
            this.jobSubmitted.emit({
              jobApplication: this.jobApplication,
              extractedData: extractedData.data,
            });
          }

          posthog.capture('cv_and_job_description_submitted_and_cv_parsed', {
            page: 'cv_optimization',
            job_application: this.jobApplication,
          });
        },
        error: (err) => {
          console.log('error when extracting data from cv: ', err);
        },
      });
  }
}
