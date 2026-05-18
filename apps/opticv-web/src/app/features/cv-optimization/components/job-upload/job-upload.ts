import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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

  cvList = this.cvOptimizationApiService.cvList;
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  form = this.fb.group({
    cvDocumentId: ['', [Validators.required]],
    companyName: ['', [Validators.required, Validators.maxLength(256)]],
    jobTitle: ['', [Validators.required, Validators.maxLength(256)]],
    jobDescription: ['', [Validators.required, Validators.maxLength(5000)]],
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

  reloadCvs(): void {
    this.cvOptimizationApiService.reloadCvList();
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
        tap((result) => {
          console.log('submit job description result: ', result);
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
            detail: 'CV and job description were successfully submited',
          });
          this.isSubmitting.set(false);
          console.log('extraced data from cv: ', extractedData);
        },
        error: (err) => {
          console.log('error when extracting data from cv: ', err);
        },
      });
  }
}
