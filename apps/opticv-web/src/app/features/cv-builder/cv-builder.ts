import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import type {
  CvCertification,
  CvContactInfo,
  CvDocument,
  CvDocumentListItem,
  CvEducationItem,
  CvExperienceItem,
  CvLanguage,
  CvProject,
  CvStructuredData,
} from '@opticv/datatypes';
import { CvApiService } from '../../core/services/cv-api.service';
import { CvStore } from '../../core/stores/cv.store';
import { SectionCard } from '../cv-optimization/components/section-card/section-card';
import { CvA4Preview } from '../cv-optimization/components/cv-a4-preview/cv-a4-preview';
import {
  CvTemplateId,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_GDPR_CLAUSE,
} from '../cv-optimization/cv-templates';
import { ExperienceSection } from './components/experience-section/experience-section';
import { EducationSection } from './components/education-section/education-section';

const EMPTY_CONTACT: CvContactInfo = {
  name: null,
  position: null,
  email: null,
  phone: null,
  location: null,
  linkedin: null,
  website: null,
};

@Component({
  selector: 'app-cv-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SectionCard,
    CvA4Preview,
    ExperienceSection,
    EducationSection,
  ],
  templateUrl: './cv-builder.html',
  styleUrl: './cv-builder.css',
})
export class CvBuilder {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cvApiService = inject(CvApiService);
  private readonly cvStore = inject(CvStore);
  private readonly messageService = inject(MessageService);

  readonly cvId = signal<string | null>(null);

  readonly contact = signal<CvContactInfo>({ ...EMPTY_CONTACT });
  readonly summary = signal<string | null>(null);
  readonly experience = signal<CvExperienceItem[]>([]);
  readonly education = signal<CvEducationItem[]>([]);
  readonly skillsText = signal<string>('');
  readonly certifications = signal<CvCertification[]>([]);
  readonly projects = signal<CvProject[]>([]);
  readonly languages = signal<CvLanguage[]>([]);
  readonly other = signal<string | null>(null);
  readonly includeGdprClause = signal<boolean>(false);
  readonly originalGdprClause = signal<string | null>(null);

  readonly selectedTemplate = signal<CvTemplateId>('default');
  readonly accentColor = signal<string>(DEFAULT_ACCENT_COLOR);

  readonly saving = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  readonly skills = computed<string[]>(() =>
    this.skillsText()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );

  readonly mergedCv = computed<CvStructuredData>(() => ({
    contact: this.contact(),
    summary: this.summary(),
    experience: this.experience(),
    education: this.education(),
    skills: this.skills(),
    certifications: this.certifications(),
    projects: this.projects(),
    languages: this.languages(),
    other: this.other(),
    gdprClause: this.computeGdprClause(),
  }));

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cvId.set(id);
      this.loadExistingCv(id);
    }
  }

  private computeGdprClause(): string | null {
    if (!this.includeGdprClause()) return null;
    return this.originalGdprClause() ?? DEFAULT_GDPR_CLAUSE;
  }

  private loadExistingCv(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.cvApiService
      .getStructuredData(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.contact.set({ ...EMPTY_CONTACT, ...data.contact });
          this.summary.set(data.summary ?? null);
          this.experience.set(data.experience ?? []);
          this.education.set(data.education ?? []);
          this.skillsText.set((data.skills ?? []).join(', '));
          this.certifications.set(data.certifications ?? []);
          this.projects.set(data.projects ?? []);
          this.languages.set(data.languages ?? []);
          this.other.set(data.other ?? null);
          this.includeGdprClause.set(!!data.gdprClause);
          this.originalGdprClause.set(data.gdprClause ?? null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadError.set(
            err?.error?.message ??
              'Could not load this CV. It may not have structured data yet.',
          );
        },
      });
  }

  updateContactField(field: keyof CvContactInfo, value: string): void {
    this.contact.update((c) => ({ ...c, [field]: value || null }));
  }

  addCertification(): void {
    this.certifications.update((list) => [
      ...list,
      { name: '', issuer: null, date: null },
    ]);
  }

  removeCertification(index: number): void {
    this.certifications.update((list) => list.filter((_, i) => i !== index));
  }

  updateCertificationField(
    index: number,
    field: keyof CvCertification,
    value: string,
  ): void {
    this.certifications.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  addProject(): void {
    this.projects.update((list) => [
      ...list,
      { name: '', description: null, technologies: [], url: null },
    ]);
  }

  removeProject(index: number): void {
    this.projects.update((list) => list.filter((_, i) => i !== index));
  }

  updateProjectField(
    index: number,
    field: 'name' | 'description' | 'url',
    value: string,
  ): void {
    this.projects.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  updateProjectTechnologies(index: number, value: string): void {
    const technologies = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    this.projects.update((list) =>
      list.map((item, i) => (i === index ? { ...item, technologies } : item)),
    );
  }

  addLanguage(): void {
    this.languages.update((list) => [
      ...list,
      { language: '', proficiency: null },
    ]);
  }

  removeLanguage(index: number): void {
    this.languages.update((list) => list.filter((_, i) => i !== index));
  }

  updateLanguageField(
    index: number,
    field: keyof CvLanguage,
    value: string,
  ): void {
    this.languages.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  save(): void {
    this.saving.set(true);
    const payload = this.mergedCv();
    const id = this.cvId();
    const request$ = id
      ? this.cvApiService.updateStructuredData(id, payload)
      : this.cvApiService.createManualCv(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (doc) => {
        this.saving.set(false);
        this.syncCvStore(doc);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'CV saved',
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.saving.set(false);
        const code = err?.error?.code;
        if (code !== 'QUOTA_EXCEEDED' && code !== 'FEATURE_NOT_AVAILABLE') {
          this.messageService.add({
            severity: 'error',
            summary: 'Save failed',
            detail:
              err?.error?.message ?? 'Could not save CV. Please try again.',
          });
        }
      },
    });
  }

  private syncCvStore(doc: CvDocument): void {
    const listItem: CvDocumentListItem = {
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      storageKey: doc.storageKey,
      createdAt: doc.createdAt,
      parsedText: doc.parsedText,
      parseStatus: doc.parseStatus,
      extractionStatus: doc.extractionStatus,
      manuallyEdited: doc.manuallyEdited,
    };
    const current = this.cvStore.cvList();
    const exists = current.some((c) => c.id === doc.id);
    const updated = exists
      ? current.map((c) => (c.id === doc.id ? listItem : c))
      : [listItem, ...current];
    this.cvStore.updateCvList(updated);
  }
}
