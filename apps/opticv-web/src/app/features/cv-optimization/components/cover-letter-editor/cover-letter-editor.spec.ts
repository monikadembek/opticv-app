import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CoverLetterEditor } from './cover-letter-editor';
import type { CoverLetterResult } from '@opticv/datatypes';

const MOCK_RESULT: CoverLetterResult = {
  salutation: 'Dear Hiring Manager,',
  signoff: 'Yours sincerely,',
  variants: [
    {
      hookType: 'achievement',
      fullLetter: 'First variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Narrative-driven',
      openingHook: 'Three years ago I shipped my first product...',
      closingCTA: 'I would love to discuss this further.',
      keywordsIncorporated: ['TypeScript', 'Angular'],
      bestFor: 'Startups and creative companies',
    },
    {
      hookType: 'insight',
      fullLetter: 'Second variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Value-led',
      openingHook: 'The biggest challenge in frontend today is...',
      closingCTA: 'Let us schedule a call.',
      keywordsIncorporated: ['NestJS'],
      bestFor: 'Enterprise and consulting roles',
    },
    {
      hookType: 'story',
      fullLetter: 'Third variant full letter text.',
      wordCount: 5,
      strategicAngle: 'Confidence-led',
      openingHook: 'I have cut release cycles by 40% at every company I have joined.',
      closingCTA: 'I am ready to do the same for you.',
      keywordsIncorporated: [],
      bestFor: 'Senior and leadership positions',
    },
  ],
  recommendedVariant: 'insight',
  recommendationReason: 'This angle matches the company culture.',
  warnings: [],
};

const MOCK_RESULT_WITH_WARNINGS: CoverLetterResult = {
  ...MOCK_RESULT,
  warnings: ['Check word count', 'Review tone for target company'],
};

describe('CoverLetterEditor', () => {
  let fixture: ComponentFixture<CoverLetterEditor>;
  let component: CoverLetterEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverLetterEditor],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CoverLetterEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('renders all variant cards', () => {
    const articles = fixture.nativeElement.querySelectorAll('[role="article"]');
    expect(articles.length).toBe(MOCK_RESULT.variants.length);
  });

  it('shows "Recommended" badge only on the recommended variant card', () => {
    const articles: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="article"]');
    const recommendedIndex = MOCK_RESULT.variants.findIndex(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    const recommendedCard = articles[recommendedIndex];
    const otherCard = articles[0];

    expect(recommendedCard.textContent).toContain('Recommended');
    expect(otherCard.textContent).not.toContain('Recommended');
  });

  it('pre-selects the recommended variant on init', () => {
    const expectedIndex = MOCK_RESULT.variants.findIndex(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    expect(component.selectedVariantIndex()).toBe(expectedIndex);
  });

  it('pre-loads editor content with the recommended variant fullLetter wrapped in HTML', () => {
    const recommended = MOCK_RESULT.variants.find(
      (v) => v.hookType === MOCK_RESULT.recommendedVariant,
    );
    const expectedHtml = `<p>${MOCK_RESULT.salutation}</p><p>${recommended!.fullLetter}</p>`;
    expect(component.editorContent()).toBe(expectedHtml);
  });

  it('updates selectedVariantIndex when selectVariant is called', () => {
    component.selectVariant(0);
    expect(component.selectedVariantIndex()).toBe(0);
  });

  it('updates editorContent to the selected variant fullLetter wrapped in HTML', () => {
    component.selectVariant(0);
    const expectedHtml = `<p>${MOCK_RESULT.salutation}</p><p>${MOCK_RESULT.variants[0].fullLetter}</p>`;
    expect(component.editorContent()).toBe(expectedHtml);
  });

  it('does not render warnings banner when warnings is empty', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Check word count');
  });

  it('renders warnings banner when warnings are present', () => {
    fixture.componentRef.setInput('result', MOCK_RESULT_WITH_WARNINGS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check word count');
    expect(fixture.nativeElement.textContent).toContain('Review tone for target company');
  });

  it('renders the recommendation reason', () => {
    expect(fixture.nativeElement.textContent).toContain(MOCK_RESULT.recommendationReason);
  });

  it('renders Export to PDF and Export to DOCX buttons', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Export to PDF');
    expect(text).toContain('Export to DOCX');
  });
});
