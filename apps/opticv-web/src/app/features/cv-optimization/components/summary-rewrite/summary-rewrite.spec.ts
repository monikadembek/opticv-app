import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryRewrite } from './summary-rewrite';
import type { SummaryRewriteResult } from '@opticv/datatypes';

const MOCK_RESULT: SummaryRewriteResult = {
  originalSummary: 'Experienced software engineer with 5 years in full-stack development.',
  variants: [
    {
      angle: 'achievement_led',
      text: 'Delivered 20+ features across distributed teams, cutting release cycles by 30%.',
      wordCount: 14,
      strategicNote: 'Leads with measurable impact to stand out in competitive roles.',
      keywordsUsed: ['TypeScript', 'Node.js'],
    },
    {
      angle: 'identity_led',
      text: 'Full-stack engineer specialising in scalable TypeScript systems and developer tooling.',
      wordCount: 12,
      strategicNote: 'Positions you as a specialist rather than a generalist.',
      keywordsUsed: ['TypeScript'],
    },
    {
      angle: 'mission_led',
      text: 'Passionate about crafting developer experiences that reduce friction and accelerate delivery.',
      wordCount: 13,
      strategicNote: 'Appeals to mission-driven organisations and product companies.',
      keywordsUsed: [],
    },
  ],
  recommendedVariant: 'achievement_led',
  recommendationReason: 'Your experience aligns best with quantifiable outcomes.',
  keywordsIncorporated: ['TypeScript', 'Node.js'],
};

describe('SummaryRewrite', () => {
  let fixture: ComponentFixture<SummaryRewrite>;
  let component: SummaryRewrite;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SummaryRewrite],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryRewrite);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('renders the original summary text when present', () => {
    expect(fixture.nativeElement.textContent).toContain(MOCK_RESULT.originalSummary);
  });

  it('isNoSummary is false when originalSummary is a real summary', () => {
    expect(component.isNoSummary()).toBe(false);
  });

  it('isNoSummary is true when originalSummary is "No summary present"', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, originalSummary: 'No summary present' });
    fixture.detectChanges();
    expect(component.isNoSummary()).toBe(true);
  });

  it('shows the no-summary placeholder message when originalSummary is "No summary present"', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, originalSummary: 'No summary present' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your CV had no summary');
  });

  it('does not show the no-summary placeholder when originalSummary is a real summary', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Your CV had no summary');
  });

  it('renders all three variant cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('[role="button"]');
    expect(cards.length).toBe(3);
  });

  it('renders human-readable angle labels', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Achievement-led');
    expect(text).toContain('Identity-led');
    expect(text).toContain('Mission-led');
  });

  it('shows "Recommended" badge only on the recommended variant card', () => {
    const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="button"]');
    const recommendedCard = Array.from(cards).find(el =>
      el.getAttribute('aria-label') === 'Select Achievement-led variant',
    );
    const otherCard = Array.from(cards).find(el =>
      el.getAttribute('aria-label') === 'Select Identity-led variant',
    );

    expect(recommendedCard?.textContent).toContain('Recommended');
    expect(otherCard?.textContent).not.toContain('Recommended');
  });

  it('renders variant text and strategic note', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(MOCK_RESULT.variants[0].text);
    expect(text).toContain(MOCK_RESULT.variants[0].strategicNote);
  });

  it('renders word count for each variant', () => {
    expect(fixture.nativeElement.textContent).toContain('14 words');
    expect(fixture.nativeElement.textContent).toContain('12 words');
    expect(fixture.nativeElement.textContent).toContain('13 words');
  });

  it('renders keywords used inside a variant card when non-empty', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('TypeScript');
    expect(text).toContain('Node.js');
  });

  it('hides keywords used section for a variant with no keywords', () => {
    const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="button"]');
    const missionCard = Array.from(cards).find(el =>
      el.getAttribute('aria-label') === 'Select Mission-led variant',
    );
    expect(missionCard?.textContent).not.toContain('Keywords used');
  });

  it('renders the recommendation reason section', () => {
    expect(fixture.nativeElement.textContent).toContain(MOCK_RESULT.recommendationReason);
    expect(fixture.nativeElement.textContent).toContain('Why the recommended variant?');
  });

  it('hides the recommendation reason section when recommendationReason is absent', () => {
    const { recommendationReason: _, ...resultWithoutReason } = MOCK_RESULT;
    fixture.componentRef.setInput('result', resultWithoutReason);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Why the recommended variant?');
  });

  it('renders the all-keywords section when keywordsIncorporated is non-empty', () => {
    expect(fixture.nativeElement.textContent).toContain('All Keywords Incorporated');
  });

  it('hides the all-keywords section when keywordsIncorporated is empty', () => {
    fixture.componentRef.setInput('result', { ...MOCK_RESULT, keywordsIncorporated: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('All Keywords Incorporated');
  });

  it('does not throw when a variant has undefined keywordsUsed (API omits the field)', () => {
    const resultWithMissingKeywords = {
      ...MOCK_RESULT,
      variants: [
        { ...MOCK_RESULT.variants[0], keywordsUsed: [] },
        ...MOCK_RESULT.variants.slice(1),
      ],
    };
    expect(() => {
      fixture.componentRef.setInput('result', resultWithMissingKeywords);
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('hides the keywords-used section for a variant with undefined keywordsUsed', () => {
    const resultWithMissingKeywords = {
      ...MOCK_RESULT,
      variants: [
        { ...MOCK_RESULT.variants[0], keywordsUsed: [] },
        ...MOCK_RESULT.variants.slice(1),
      ],
    };
    fixture.componentRef.setInput('result', resultWithMissingKeywords);
    fixture.detectChanges();
    const cards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="button"]');
    const achievementCard = Array.from(cards).find((el) =>
      el.getAttribute('aria-label')?.includes('Achievement-led'),
    );
    expect(achievementCard?.textContent).not.toContain('Keywords used');
  });

  it('hides the editor section when no angle is selected', () => {
    expect(fixture.nativeElement.textContent).not.toContain('variant selected');
  });

  it('shows the editor section when an angle is selected', () => {
    fixture.componentRef.setInput('selectedAngle', 'achievement_led');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Achievement-led variant selected');
  });

  it('shows the Reset button when a variant is selected', () => {
    fixture.componentRef.setInput('selectedAngle', 'achievement_led');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Reset summary selection"]');
    expect(btn).not.toBeNull();
  });

  it('hides the Reset button when no variant is selected', () => {
    const btn = fixture.nativeElement.querySelector('[aria-label="Reset summary selection"]');
    expect(btn).toBeNull();
  });

  it('clicking Reset emits angleReset', () => {
    fixture.componentRef.setInput('selectedAngle', 'achievement_led');
    fixture.detectChanges();
    let emitted = false;
    component.angleReset.subscribe(() => { emitted = true; });
    const btn: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Reset summary selection"]');
    btn.click();
    expect(emitted).toBe(true);
  });
});
