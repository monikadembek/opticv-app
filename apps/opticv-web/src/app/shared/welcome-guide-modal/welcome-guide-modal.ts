import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import posthog from 'posthog-js';
import {
  UserGuideStore,
  LAST_STEP_INDEX,
} from '../../core/stores/user-guide.store';
import { Supabase } from '../../core/auth/services/supabase';

interface TourStepData {
  tag: string;
  title: string;
  caption: string;
  image: string;
  alt: string;
}

const TOUR_STEPS: TourStepData[] = [
  {
    tag: 'Step 1 · Upload',
    title: 'Upload your CV once',
    caption:
      'Drop in a PDF or DOCX file with your Resume. We store it in the app so you can use it to tailor for every job you chase.',
    image: '/images/welcome-tour/step-1-upload-cv-page.png',
    alt: 'Screenshot of the CV upload page',
  },
  {
    tag: 'Step 2 · Optimize',
    title: 'Point it at a specific job',
    caption:
      'Paste the job description and company details - OptiCV tailors everything to that exact posting.',
    image: '/images/welcome-tour/step-2-cv-optimization-page.png',
    alt: 'Screenshot of the CV optimization page',
  },
  {
    tag: 'Step 3 · Analyze',
    title: 'Run optimization process and see your ATS score',
    caption:
      'An instant ATS score, keyword gaps and rewrites that lift your estimated ATS score.',
    image: '/images/welcome-tour/step-3-analyze.png',
    alt: 'Screenshot of loaded CV optimization results',
  },
  {
    tag: 'Step 4 · Apply',
    title: 'Apply suggestions and export optimized CV',
    caption:
      'Select suggestions, modify them if needed, they will be applied to your CV. Export your optimized CV to PDF or DOCX file with one of the available templates.',
    image: '/images/welcome-tour/step-4-export-cv.png',
    alt: 'Screenshot of loaded CV optimization results',
  },
  {
    tag: 'Step 5 · Apply',
    title: 'Get a matching cover letter',
    caption:
      'Get 3 variants of a tailored cover letter, edit selected one and then export to PDF or DOCX.',
    image: '/images/welcome-tour/step-5-cover-letter.png',
    alt: 'Screenshot of the cover letter page',
  },
  {
    tag: 'Step 6 · Apply',
    title: 'Walk in interview-ready',
    caption:
      'Get likely questions, model answers and traps to avoid, all matched to the role.',
    image: '/images/welcome-tour/step-6-interview-prep.png',
    alt: 'Screenshot of the interview prep page',
  },
  {
    tag: 'Step 7 · Apply',
    title: 'Polish your LinkedIn',
    caption:
      'Get headline variants and rewritten About section so recruiters can find you too.',
    image: '/images/welcome-tour/step-7-linked-in-profile.png',
    alt: 'Screenshot of the LinkedIn profile page',
  },
];

@Component({
  selector: 'app-welcome-guide-modal',
  imports: [DialogModule, ButtonModule, NgOptimizedImage],
  templateUrl: './welcome-guide-modal.html',
  styleUrl: './welcome-guide-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeGuideModal {
  protected readonly userGuideStore = inject(UserGuideStore);
  private readonly supabase = inject(Supabase);

  readonly lastStepIndex = LAST_STEP_INDEX;

  protected readonly tourSteps = TOUR_STEPS;

  protected readonly currentStep = computed(
    () => this.tourSteps[this.userGuideStore.stepIndex()],
  );

  protected readonly nextLabel = computed(() =>
    this.userGuideStore.stepIndex() === this.lastStepIndex ? 'Finish' : 'Next',
  );

  onHide(): void {
    if (this.userGuideStore.mode() === 'tour') {
      this.userGuideStore.closeWelcomeModal();
      posthog.capture('welcome_modal_dismissed');
      return;
    }

    const email = this.supabase.currentUser()?.email;

    if (email) {
      this.userGuideStore.markWelcomeSeen(email);
    } else {
      this.userGuideStore.closeWelcomeModal();
    }

    posthog.capture('welcome_modal_dismissed');
  }

  onSkip(): void {
    this.onHide();
  }

  onGetStarted(): void {
    this.onHide();
  }

  onCloseIcon(): void {
    this.onHide();
  }

  onStartTour(): void {
    this.userGuideStore.startTour();
  }

  onNext(): void {
    const isLastStep = this.userGuideStore.stepIndex() === this.lastStepIndex;
    const isTourMode = this.userGuideStore.mode() === 'tour';

    if (isLastStep && isTourMode) {
      this.onHide();
      return;
    }

    this.userGuideStore.nextStep();
  }

  onPrev(): void {
    this.userGuideStore.prevStep();
  }

  onDotClick(index: number): void {
    this.userGuideStore.goToStep(index);
  }

  onReplay(): void {
    this.userGuideStore.replayTour();
  }
}
