import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
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
  };
  let messageService: { add: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

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
        .mockReturnValue(of({ data: mockStructuredData })),
      createManualCv: vi.fn().mockReturnValue(of(mockCvDocument)),
      updateStructuredData: vi.fn().mockReturnValue(of(mockCvDocument)),
    };
    messageService = { add: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [CvBuilder],
      providers: [
        { provide: CvApiService, useValue: cvApiService },
        { provide: MessageService, useValue: messageService },
        { provide: Router, useValue: router },
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

    it('calls createManualCv on save', () => {
      component.save();

      expect(cvApiService.createManualCv).toHaveBeenCalledWith(
        component.mergedCv(),
      );
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

    it('calls updateStructuredData on save with the existing cvId', () => {
      component.save();

      expect(cvApiService.updateStructuredData).toHaveBeenCalledWith(
        'doc-id',
        component.mergedCv(),
      );
      expect(cvApiService.createManualCv).not.toHaveBeenCalled();
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
        of({ data: malformedData }),
      );

      TestBed.configureTestingModule({
        imports: [CvBuilder],
        providers: [
          { provide: CvApiService, useValue: cvApiService },
          { provide: MessageService, useValue: messageService },
          { provide: Router, useValue: router },
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
