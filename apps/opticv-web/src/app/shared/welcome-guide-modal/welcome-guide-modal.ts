import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import posthog from 'posthog-js';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { Supabase } from '../../core/auth/services/supabase';

interface TourStepData {
  tag: string;
  title: string;
  caption: string;
  image: string;
  alt: string;
}

const LAST_STEP_INDEX = 5;

const TOUR_STEPS: TourStepData[] = [
  {
    tag: 'Step 1 · Upload',
    title: 'Upload your CV once',
    caption:
      'Drop in a PDF or DOCX. We keep it on hand to tailor for every job you chase.',
    image: '/images/welcome-tour/step-1-upload-cv-page.png',
    alt: 'Screenshot of the CV upload page',
  },
  {
    tag: 'Step 2 · Optimize',
    title: 'Point it at a job',
    caption:
      'Paste the job description and company details — OptiCV tailors everything to that exact posting.',
    image: '/images/welcome-tour/step-2-cv-optimization-page.png',
    alt: 'Screenshot of the CV optimization page',
  },
  {
    tag: 'Step 3 · Analyze',
    title: 'See your ATS score',
    caption:
      'An instant ATS score, keyword gaps and a rewrite that lifts a 70 to a 90.',
    image: '/images/welcome-tour/step-3-loaded-cv-optimization-results.png',
    alt: 'Screenshot of loaded CV optimization results',
  },
  {
    tag: 'Step 4 · Apply',
    title: 'Get a matching cover letter',
    caption:
      'A tailored cover letter in your voice — edit it inline, then export to PDF or DOCX.',
    image: '/images/welcome-tour/step-4-cover-letter.png',
    alt: 'Screenshot of the cover letter page',
  },
  {
    tag: 'Step 5 · Apply',
    title: 'Walk in interview-ready',
    caption:
      'Likely questions, model answers and traps to avoid — matched to the role.',
    image: '/images/welcome-tour/step-5-interview-prep.png',
    alt: 'Screenshot of the interview prep page',
  },
  {
    tag: 'Step 6 · Apply',
    title: 'Polish your LinkedIn',
    caption:
      'Headline variants and profile rewrites so recruiters find you too.',
    image: '/images/welcome-tour/step-6-linked-in-profile.png',
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

  protected readonly tourSteps = TOUR_STEPS;

  protected readonly currentStep = computed(
    () => this.tourSteps[this.userGuideStore.stepIndex()],
  );

  protected readonly nextLabel = computed(() =>
    this.userGuideStore.stepIndex() === LAST_STEP_INDEX ? 'Finish' : 'Next',
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
    const isLastStep = this.userGuideStore.stepIndex() === LAST_STEP_INDEX;
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
