import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CvStructuredData } from '@opticv/datatypes';
import { CvTemplatePreview } from './cv-template-preview';
import type { CvTemplateId } from '../../cv-templates';

const ALL_TEMPLATE_IDS: CvTemplateId[] = [
  'default',
  'classic',
  'modern',
  'corporate',
  'minimal',
  'impact',
];

const makeCv = (gdprClause: string | null): CvStructuredData => ({
  contact: {
    name: 'Jane Doe',
    position: 'Senior Software Engineer',
    email: 'jane@example.com',
    phone: '555-1234',
    location: 'Remote',
    linkedin: null,
    website: null,
  },
  summary: 'Experienced engineer.',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
  gdprClause,
});

describe('CvTemplatePreview', () => {
  let fixture: ComponentFixture<CvTemplatePreview>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CvTemplatePreview],
    }).compileComponents();
    fixture = TestBed.createComponent(CvTemplatePreview);
  });

  describe.each(ALL_TEMPLATE_IDS)('template %s', (templateId) => {
    it('renders the gdprClause text when present', () => {
      fixture.componentRef.setInput(
        'cv',
        makeCv('I consent to data processing.'),
      );
      fixture.componentRef.setInput('templateId', templateId);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'I consent to data processing.',
      );
    });

    it('does not render a gdprClause block when null', () => {
      fixture.componentRef.setInput('cv', makeCv(null));
      fixture.componentRef.setInput('templateId', templateId);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain(
        'I consent to data processing.',
      );
    });
  });
});
