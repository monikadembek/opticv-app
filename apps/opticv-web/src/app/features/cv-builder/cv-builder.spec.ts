import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { CvDocument, CvStructuredData } from '@opticv/datatypes';
import { CvBuilder } from './cv-builder';
import { CvApiService } from '../../core/services/cv-api.service';
import { CvStore } from '../../core/stores/cv.store';

const mockStructuredData: CvStructuredData = {
  contact: {
    name: 'Jane Doe',
    position: 'Engineer',
    email: 'jane@example.com',
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: 'Experienced engineer',
  experience: [],
  education: [],
  skills: ['TypeScript', 'Angular'],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
  gdprClause: 'Custom clause text',
};

const mockCvDocument: CvDocument = {
  id: 'doc-id',
  userId: 'user-id',
  name: 'My CV',
  fileName: null,
  fileSize: null,
  mimeType: null,
  storageKey: null,
  parsedText: null,
  parseStatus: 'COMPLETED',
  structuredData: mockStructuredData,
  extractionStatus: 'COMPLETED',
  isActive: true,
  manuallyEdited: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function makeActivatedRoute(id: string | null = null) {
  return {
    snapshot: {
      paramMap: convertToParamMap(id ? { id } : {}),
    },
  };
}

describe('CvBuilder', () => {
  let fixture: ComponentFixture<CvBuilder>;
  let component: CvBuilder;
  let cvApiService: {
    getStructuredData: ReturnType<typeof vi.fn>;
    createManualCv: ReturnType<typeof vi.fn>;
    updateStructuredData: ReturnType<typeof vi.fn>;
    renameCv: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
    lastSuccessfulNavigation: ReturnType<
      typeof signal<{ previousNavigation: unknown } | null>
    >;
  };
  let location: { back: ReturnType<typeof vi.fn> };

  function setup(routeId: string | null = null) {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.resetTestingModule();

    cvApiService = {
      getStructuredData: vi
        .fn()
        .mockReturnValue(of({ data: mockStructuredData, name: 'My CV' })),
      createManualCv: vi.fn().mockReturnValue(of(mockCvDocument)),
      updateStructuredData: vi.fn().mockReturnValue(of(mockCvDocument)),
      renameCv: vi.fn().mockReturnValue(of(mockCvDocument)),
    };
    messageService = { add: vi.fn() };
    router = {
      navigate: vi.fn(),
      lastSuccessfulNavigation: signal<{ previousNavigation: unknown } | null>(
        null,
      ),
    };
    location = { back: vi.fn() };

    TestBed.configureTestingModule({
      imports: [CvBuilder],
      providers: [
        { provide: CvApiService, useValue: cvApiService },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: router },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: makeActivatedRoute(routeId) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CvBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('create mode', () => {
    beforeEach(() => setup(null));

    it('creates with all fields empty/default', () => {
      expect(component.cvId()).toBeNull();
      expect(component.contact().name).toBeNull();
      expect(component.experience()).toEqual([]);
      expect(component.education()).toEqual([]);
      expect(component.skills()).toEqual([]);
      expect(component.includeGdprClause()).toBe(false);
    });

    it('does not fetch structured data', () => {
      expect(cvApiService.getStructuredData).not.toHaveBeenCalled();
    });

    it('defaults the name to "Untitled CV"', () => {
      expect(component.name()).toBe('Untitled CV');
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('#cv-name');
      expect(input.value).toBe('Untitled CV');
    });

    it('calls createManualCv on save with the trimmed name', () => {
      component.name.set('  Frontend CV  ');
      component.save();

      expect(cvApiService.createManualCv).toHaveBeenCalledWith({
        ...component.mergedCv(),
        name: 'Frontend CV',
      });
      expect(cvApiService.renameCv).not.toHaveBeenCalled();
      expect(cvApiService.updateStructuredData).not.toHaveBeenCalled();
    });

    it('navigates to dashboard and shows success toast after save', () => {
      component.save();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', detail: 'CV saved' }),
      );
    });

    it('adds the new CV to the store', () => {
      const cvStore = TestBed.inject(CvStore);
      component.save();

      expect(cvStore.cvList().some((c) => c.id === mockCvDocument.id)).toBe(
        true,
      );
    });

    it('shows an error toast when save fails with a non-quota error', () => {
      cvApiService.createManualCv.mockReturnValue(
        throwError(() => ({ error: { message: 'Save failed' } })),
      );

      component.save();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Save failed' }),
      );
    });

    it('joins array error messages in the toast', () => {
      cvApiService.createManualCv.mockReturnValue(
        throwError(() => ({ error: { message: ['a is bad', 'b is bad'] } })),
      );

      component.save();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'a is bad, b is bad' }),
      );
    });

    describe('name validation', () => {
      const saveButton = () =>
        fixture.nativeElement.querySelector('p-button[label="Save"] button');
      const nameInput = (): HTMLInputElement =>
        fixture.nativeElement.querySelector('#cv-name');

      it.each([
        ['empty', '', 'CV name is required.'],
        ['whitespace-only', '   ', 'CV name is required.'],
        [
          'over 100 characters',
          'a'.repeat(101),
          'CV name must be 100 characters or fewer.',
        ],
      ])(
        'disables Save and shows a linked error for an %s name',
        (_, value, message) => {
          component.name.set(value);
          fixture.detectChanges();

          expect(saveButton().disabled).toBe(true);
          const error = fixture.nativeElement.querySelector('#cv-name-error');
          expect(error.textContent).toContain(message);
          expect(error.getAttribute('role')).toBe('alert');
          expect(nameInput().getAttribute('aria-describedby')).toBe(
            'cv-name-error',
          );
          expect(nameInput().getAttribute('aria-invalid')).toBe('true');
        },
      );

      it('has no error for a valid name', () => {
        expect(
          fixture.nativeElement.querySelector('#cv-name-error'),
        ).toBeNull();
        expect(nameInput().getAttribute('aria-describedby')).toBeNull();
        expect(saveButton().disabled).toBe(false);
      });

      it('does not save while the name is invalid', () => {
        component.name.set('  ');
        component.save();

        expect(cvApiService.createManualCv).not.toHaveBeenCalled();
        expect(component.saving()).toBe(false);
      });
    });

    describe('cancel', () => {
      it('renders a Cancel button next to Save', () => {
        const labels = Array.from(
          fixture.nativeElement.querySelectorAll(
            '.builder-actions p-button',
          ) as NodeListOf<Element>,
        ).map((b) => b.getAttribute('label'));
        expect(labels).toEqual(['Cancel', 'Save']);
      });

      it('goes back to the previous page when there is one', () => {
        router.lastSuccessfulNavigation.set({ previousNavigation: {} });

        component.cancel();

        expect(location.back).toHaveBeenCalledOnce();
        expect(router.navigate).not.toHaveBeenCalled();
      });

      it('falls back to the dashboard when there is no previous page', () => {
        router.lastSuccessfulNavigation.set({ previousNavigation: null });

        component.cancel();

        expect(location.back).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      });

      it('does nothing while saving', () => {
        router.lastSuccessfulNavigation.set({ previousNavigation: {} });
        component.saving.set(true);

        component.cancel();

        expect(location.back).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
      });

      it('does not save anything', () => {
        component.cancel();

        expect(cvApiService.createManualCv).not.toHaveBeenCalled();
        expect(cvApiService.updateStructuredData).not.toHaveBeenCalled();
      });
    });

    it('does not show a duplicate toast for QUOTA_EXCEEDED errors', () => {
      cvApiService.createManualCv.mockReturnValue(
        throwError(() => ({ error: { code: 'QUOTA_EXCEEDED' } })),
      );

      component.save();

      expect(messageService.add).not.toHaveBeenCalled();
    });

    describe('GDPR clause computation', () => {
      it('is null when unchecked', () => {
        component.includeGdprClause.set(false);
        expect(component.mergedCv().gdprClause).toBeNull();
      });

      it('uses DEFAULT_GDPR_CLAUSE when checked with no original clause', () => {
        component.includeGdprClause.set(true);
        expect(component.mergedCv().gdprClause).toContain(
          'Regulation (EU) 2016/679',
        );
      });

      it('uses the original clause when checked and one was loaded', () => {
        component.originalGdprClause.set('Original clause text');
        component.includeGdprClause.set(true);
        expect(component.mergedCv().gdprClause).toBe('Original clause text');
      });
    });

    describe('repeatable sections', () => {
      it('adds and removes an experience entry', () => {
        component.experience.set([
          {
            title: 'Engineer',
            company: null,
            location: null,
            startDate: null,
            endDate: null,
            current: false,
            bullets: [],
          },
        ]);
        expect(component.experience().length).toBe(1);

        component.experience.set([]);
        expect(component.experience().length).toBe(0);
      });

      it('adds and removes an education entry', () => {
        component.education.set([
          {
            degree: 'B.Sc.',
            institution: null,
            location: null,
            startDate: null,
            endDate: null,
            field: null,
          },
        ]);
        expect(component.education().length).toBe(1);

        component.education.set([]);
        expect(component.education().length).toBe(0);
      });

      it('adds and removes a certification', () => {
        component.addCertification();
        expect(component.certifications().length).toBe(1);

        component.removeCertification(0);
        expect(component.certifications().length).toBe(0);
      });

      it('adds and removes a project', () => {
        component.addProject();
        expect(component.projects().length).toBe(1);

        component.removeProject(0);
        expect(component.projects().length).toBe(0);
      });

      it('adds and removes a language', () => {
        component.addLanguage();
        expect(component.languages().length).toBe(1);

        component.removeLanguage(0);
        expect(component.languages().length).toBe(0);
      });
    });
  });

  describe('unsaved changes', () => {
    const confirmSpy = () =>
      vi.spyOn(
        fixture.debugElement.injector.get(ConfirmationService),
        'confirm',
      );

    describe('create mode', () => {
      beforeEach(() => setup(null));

      it('has no unsaved changes initially', () => {
        expect(component.hasUnsavedChanges()).toBe(false);
        expect(component.canDeactivate()).toBe(true);
      });

      it('detects edits to the CV and its name', () => {
        component.summary.set('Something new');
        expect(component.hasUnsavedChanges()).toBe(true);

        component.summary.set(null);
        expect(component.hasUnsavedChanges()).toBe(false);

        component.name.set('Another name');
        expect(component.hasUnsavedChanges()).toBe(true);
      });

      it('ignores whitespace-only changes to the name', () => {
        component.name.set('  Untitled CV  ');
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      it('asks before leaving and stays when the user keeps editing', async () => {
        const spy = confirmSpy().mockImplementation((opts) => {
          opts.reject?.();
          return fixture.debugElement.injector.get(ConfirmationService);
        });
        component.summary.set('Something new');

        await expect(component.canDeactivate()).resolves.toBe(false);
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'unsaved-changes',
            header: 'Discard changes?',
            acceptLabel: 'Discard changes',
            rejectLabel: 'Keep editing',
          }),
        );
      });

      it('leaves when the user discards the changes', async () => {
        confirmSpy().mockImplementation((opts) => {
          opts.accept?.();
          return fixture.debugElement.injector.get(ConfirmationService);
        });
        component.summary.set('Something new');

        await expect(component.canDeactivate()).resolves.toBe(true);
      });

      it('does not ask after a successful save', () => {
        const spy = confirmSpy();
        component.summary.set('Something new');

        component.save();

        expect(component.hasUnsavedChanges()).toBe(false);
        expect(component.canDeactivate()).toBe(true);
        expect(spy).not.toHaveBeenCalled();
      });

      it('keeps the changes marked as unsaved when saving fails', () => {
        cvApiService.createManualCv.mockReturnValue(
          throwError(() => ({ error: { message: 'Save failed' } })),
        );
        component.summary.set('Something new');

        component.save();

        expect(component.hasUnsavedChanges()).toBe(true);
      });

      it('blocks the browser unload only when there are unsaved changes', () => {
        const clean = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(clean);
        expect(clean.defaultPrevented).toBe(false);

        component.summary.set('Something new');
        const dirty = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirty);
        expect(dirty.defaultPrevented).toBe(true);
      });
    });

    describe('edit mode', () => {
      beforeEach(() => setup('doc-id'));

      it('has no unsaved changes right after loading', () => {
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      it('detects edits to the loaded CV', () => {
        component.skillsText.set('TypeScript');
        expect(component.hasUnsavedChanges()).toBe(true);
      });
    });

    it('does not ask when the CV failed to load', () => {
      setup('doc-id'); // initialises the mocks
      TestBed.resetTestingModule();
      cvApiService.getStructuredData.mockReturnValue(
        throwError(() => ({ error: { message: 'Not found' } })),
      );
      TestBed.configureTestingModule({
        imports: [CvBuilder],
        providers: [
          { provide: CvApiService, useValue: cvApiService },
          { provide: MessageService, useValue: messageService },
          { provide: Router, useValue: router },
          { provide: Location, useValue: location },
          { provide: ActivatedRoute, useValue: makeActivatedRoute('doc-id') },
        ],
      });
      const failed = TestBed.createComponent(CvBuilder);
      failed.detectChanges();

      expect(failed.componentInstance.hasUnsavedChanges()).toBe(false);
      expect(failed.componentInstance.canDeactivate()).toBe(true);
    });
  });

  describe('edit mode', () => {
    beforeEach(() => setup('doc-id'));

    it('fetches structured data for the given id', () => {
      expect(cvApiService.getStructuredData).toHaveBeenCalledWith('doc-id');
    });

    it('populates fields from the fetched structured data', () => {
      expect(component.contact()).toEqual(mockStructuredData.contact);
      expect(component.summary()).toBe(mockStructuredData.summary);
      expect(component.skillsText()).toBe('TypeScript, Angular');
      expect(component.includeGdprClause()).toBe(true);
      expect(component.originalGdprClause()).toBe('Custom clause text');
    });

    it('prefills the name from the structured data response', () => {
      expect(component.name()).toBe('My CV');
      expect(component.originalName()).toBe('My CV');
    });

    it('calls updateStructuredData on save with the existing cvId', () => {
      component.save();

      expect(cvApiService.updateStructuredData).toHaveBeenCalledWith(
        'doc-id',
        component.mergedCv(),
      );
      expect(cvApiService.createManualCv).not.toHaveBeenCalled();
    });

    it('does not rename when the name is unchanged', () => {
      component.name.set('  My CV ');
      component.save();

      expect(cvApiService.renameCv).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('renames after updating structured data when the name changed', () => {
      component.name.set(' Renamed CV ');
      component.save();

      expect(cvApiService.renameCv).toHaveBeenCalledWith(
        'doc-id',
        'Renamed CV',
      );
      expect(
        cvApiService.updateStructuredData.mock.invocationCallOrder[0],
      ).toBeLessThan(cvApiService.renameCv.mock.invocationCallOrder[0]);
    });

    it('stores the renamed document name and updatedAt', () => {
      const renamed: CvDocument = {
        ...mockCvDocument,
        name: 'Renamed CV',
        updatedAt: '2024-03-01T00:00:00.000Z',
      };
      cvApiService.renameCv.mockReturnValue(of(renamed));
      const cvStore = TestBed.inject(CvStore);

      component.name.set('Renamed CV');
      component.save();

      const item = cvStore.cvList().find((c) => c.id === 'doc-id');
      expect(item?.name).toBe('Renamed CV');
      expect(item?.updatedAt).toBe('2024-03-01T00:00:00.000Z');
    });

    it('shows an error and does not navigate when the rename fails', () => {
      cvApiService.renameCv.mockReturnValue(
        throwError(() => ({ error: { message: 'CV document not found.' } })),
      );

      component.name.set('Renamed CV');
      component.save();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'CV document not found.',
        }),
      );
      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    });

    it('sets loadError when the fetch fails', () => {
      TestBed.resetTestingModule();
      cvApiService.getStructuredData.mockReturnValue(
        throwError(() => ({ error: { message: 'Not found' } })),
      );

      TestBed.configureTestingModule({
        imports: [CvBuilder],
        providers: [
          { provide: CvApiService, useValue: cvApiService },
          { provide: MessageService, useValue: messageService },
          { provide: Router, useValue: router },
          { provide: Location, useValue: location },
          { provide: ActivatedRoute, useValue: makeActivatedRoute('doc-id') },
        ],
      }).compileComponents();

      const failFixture = TestBed.createComponent(CvBuilder);
      failFixture.detectChanges();

      expect(failFixture.componentInstance.loadError()).toBe('Not found');
    });

    it('does not throw and defaults missing array/object fields when stored data is malformed', () => {
      TestBed.resetTestingModule();
      const malformedData = {
        contact: undefined,
        summary: undefined,
        experience: undefined,
        education: undefined,
        skills: undefined,
        certifications: undefined,
        projects: undefined,
        languages: undefined,
        other: undefined,
        gdprClause: undefined,
      } as unknown as CvStructuredData;
      cvApiService.getStructuredData.mockReturnValue(
        of({ data: malformedData, name: 'My CV' }),
      );

      TestBed.configureTestingModule({
        imports: [CvBuilder],
        providers: [
          { provide: CvApiService, useValue: cvApiService },
          { provide: MessageService, useValue: messageService },
          { provide: Router, useValue: router },
          { provide: Location, useValue: location },
          { provide: ActivatedRoute, useValue: makeActivatedRoute('doc-id') },
        ],
      }).compileComponents();

      const malformedFixture = TestBed.createComponent(CvBuilder);
      expect(() => malformedFixture.detectChanges()).not.toThrow();

      const c = malformedFixture.componentInstance;
      expect(c.loadError()).toBeNull();
      expect(c.experience()).toEqual([]);
      expect(c.education()).toEqual([]);
      expect(c.certifications()).toEqual([]);
      expect(c.projects()).toEqual([]);
      expect(c.languages()).toEqual([]);
      expect(c.skillsText()).toBe('');
      expect(c.summary()).toBeNull();
      expect(c.other()).toBeNull();
      expect(c.includeGdprClause()).toBe(false);
    });
  });
});
