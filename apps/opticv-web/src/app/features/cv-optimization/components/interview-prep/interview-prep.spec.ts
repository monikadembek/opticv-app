import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InterviewPrep } from './interview-prep';
import type { InterviewPrepResult } from '@opticv/datatypes';

const MOCK_RESULT: InterviewPrepResult = {
  questions: [
    {
      question: 'Tell me about a time you led a complex project.',
      category: 'behavioral',
      likelihood: 'very_high',
      whatTheyreAssessing: 'Leadership and ownership',
      suggestedAnswer:
        'Situation: I led a migration of our monolith to microservices. Task: coordinate 4 engineers. Action: set up weekly syncs and a shared RFC process. Result: shipped on time with zero downtime.',
      answerWordCount: 45,
      answerStructure: 'STAR',
      needsUserInput: true,
      placeholdersToFill: ['[number of engineers]', '[timeline]'],
      followUps: [
        {
          followUpQuestion: 'What would you do differently?',
          guidance: 'Focus on one concrete improvement and tie it to outcome.',
        },
      ],
      trapsToAvoid: ['Blaming team members', 'Focusing only on technical details'],
    },
    {
      question: 'How do you handle conflicting priorities?',
      category: 'situational',
      likelihood: 'high',
      whatTheyreAssessing: 'Prioritisation and communication',
      suggestedAnswer:
        'I use a simple impact-vs-effort matrix to rank tasks and align with my manager when there is ambiguity.',
      answerWordCount: 25,
      answerStructure: 'direct',
      needsUserInput: false,
      placeholdersToFill: [],
      followUps: [],
      trapsToAvoid: [],
    },
  ],
  questionsToAskInterviewer: [
    {
      question: 'What does success look like in the first 90 days?',
      rationale: 'Shows you are results-oriented and want clarity on expectations.',
    },
    {
      question: 'How does the team handle technical debt?',
      rationale: 'Reveals engineering culture and pragmatism.',
    },
  ],
  stressTestQuestions: [
    {
      question: 'Why have you been in your current role for only 18 months?',
      whyItllComeUp: 'Short tenure raises red flags for hiring managers.',
      recommendedAnswer:
        'I was brought in for a specific initiative that concluded. I am proud of what we delivered and now looking for a longer-term challenge.',
    },
  ],
  preparationTips: [
    'Research the company values and align your STAR stories to them.',
    'Prepare three concrete examples with measurable outcomes.',
  ],
};

describe('InterviewPrep', () => {
  let fixture: ComponentFixture<InterviewPrep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewPrep],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewPrep);
    fixture.componentRef.setInput('result', MOCK_RESULT);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('interview questions', () => {
    it('renders question text for first question', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Tell me about a time you led a complex project.',
      );
    });

    it('renders category badge text', () => {
      expect(fixture.nativeElement.textContent).toContain('behavioral');
    });

    it('renders likelihood badge when present', () => {
      expect(fixture.nativeElement.textContent).toContain('very_high');
    });

    it('does not render likelihood badge when absent', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        questions: [{ ...MOCK_RESULT.questions[0], likelihood: undefined }],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('very_high');
    });

    it('renders "what they\'re assessing" text', () => {
      expect(fixture.nativeElement.textContent).toContain('Leadership and ownership');
    });

    it('renders suggested answer text', () => {
      expect(fixture.nativeElement.textContent).toContain(
        'Situation: I led a migration of our monolith to microservices.',
      );
    });

    it('renders answer structure badge', () => {
      expect(fixture.nativeElement.textContent).toContain('STAR');
    });

    it('shows placeholder fill note when needsUserInput is true and placeholdersToFill is non-empty', () => {
      expect(fixture.nativeElement.textContent).toContain('Fill in:');
      expect(fixture.nativeElement.textContent).toContain('[number of engineers]');
      expect(fixture.nativeElement.textContent).toContain('[timeline]');
    });

    it('hides placeholder fill note when needsUserInput is false', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        questions: [MOCK_RESULT.questions[1]],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Fill in:');
    });

    it('renders traps to avoid when non-empty', () => {
      expect(fixture.nativeElement.textContent).toContain('Traps to avoid');
      expect(fixture.nativeElement.textContent).toContain('Blaming team members');
    });

    it('hides traps section when trapsToAvoid is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        questions: [MOCK_RESULT.questions[1]],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Traps to avoid');
    });

    it('shows "No questions available." when questions is empty', () => {
      fixture.componentRef.setInput('result', { ...MOCK_RESULT, questions: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No questions available.');
    });
  });

  describe('questions to ask interviewer', () => {
    it('renders section heading and question text', () => {
      expect(fixture.nativeElement.textContent).toContain('Questions to Ask Interviewer');
      expect(fixture.nativeElement.textContent).toContain(
        'What does success look like in the first 90 days?',
      );
    });

    it('hides section when questionsToAskInterviewer is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        questionsToAskInterviewer: [],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Questions to Ask Interviewer');
    });
  });

  describe('stress-test questions', () => {
    it('renders section heading and question text', () => {
      expect(fixture.nativeElement.textContent).toContain('Stress-Test Questions');
      expect(fixture.nativeElement.textContent).toContain(
        'Why have you been in your current role for only 18 months?',
      );
    });

    it('hides section when stressTestQuestions is empty', () => {
      fixture.componentRef.setInput('result', {
        ...MOCK_RESULT,
        stressTestQuestions: [],
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Stress-Test Questions');
    });
  });

  describe('preparation tips', () => {
    it('renders section heading and tip text', () => {
      expect(fixture.nativeElement.textContent).toContain('Preparation Tips');
      expect(fixture.nativeElement.textContent).toContain(
        'Research the company values and align your STAR stories to them.',
      );
    });

    it('hides section when preparationTips is empty', () => {
      fixture.componentRef.setInput('result', { ...MOCK_RESULT, preparationTips: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Preparation Tips');
    });
  });
});
