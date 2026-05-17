import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
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

@Component({
  selector: 'app-cv-optimization-step1',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Select,
    InputText,
    Textarea,
    Button,
  ],
  templateUrl: './cv-optimization-step1.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimizationStep1 {
  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  readonly activateCallback = input<(step: number) => void>();

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

    this.cvOptimizationApiService.createJobApplication(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'CV and job description were successfully submited',
        });
        this.isSubmitting.set(false);
        this.activateCallback()?.(2);
      },
      error: (err) => {
        const errorMsg =
          err?.error?.message ?? 'Submitting CV and job offer failed';
        this.submitError.set(errorMsg);
        this.isSubmitting.set(false);
      },
    });
  }
}
