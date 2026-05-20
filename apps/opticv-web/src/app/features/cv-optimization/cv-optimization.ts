import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { from, mergeMap, switchMap, take, tap } from 'rxjs';
import { JobUpload } from './components/job-upload/job-upload';
import { AccordionModule } from 'primeng/accordion';
import { JobApplication, PromptType } from '@opticv/datatypes';
import {
  CvOptimizationApiService,
  SseJobCompleteEvent,
} from './services/cv-optimization-api.service';

@Component({
  selector: 'app-cv-optimization-page',
  imports: [JobUpload, AccordionModule, JsonPipe],
  templateUrl: './cv-optimization.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvOptimization {
  // TODO: retry failed job - run single optimization for prompt type that failed
  // TODO: run full optimimzation proces instead one by one

  private readonly cvOptimizationApiService = inject(CvOptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly PromptType = PromptType;
  readonly results = signal<Map<PromptType, SseJobCompleteEvent>>(new Map());
  readonly isProcessing = signal<Map<PromptType, boolean>>(new Map());

  runOptimization(jobApplication: JobApplication): void {
    this.results.set(new Map());
    this.isProcessing.set(new Map());

    // for testing purposes take 2 prompt types only and run signle optimization
    // but the proper flow should be run full optimization and the allow rerunnin single prompts
    // where we get status failed

    from(Object.values(PromptType))
      .pipe(
        take(2),
        tap((promptType) => console.log('promptType:', promptType)),
        mergeMap(
          (promptType) =>
            this.cvOptimizationApiService
              .runSingleOptimizationProcess(jobApplication.id, promptType)
              .pipe(
                switchMap(({ runId }) => {
                  this.isProcessing.update((map) =>
                    new Map(map).set(promptType, true),
                  );
                  return this.cvOptimizationApiService.streamOptimizationEvents(
                    jobApplication.id,
                    runId,
                  );
                }),
              ),
          3,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event: SseJobCompleteEvent) => {
          console.log('SSE - job complete event:', event);
          this.isProcessing.update((map) =>
            new Map(map).set(event.promptType, false),
          );
          this.results.update((map) =>
            new Map(map).set(event.promptType, event),
          );
        },
        error: (err) => console.error('Optimization stream error', err),
      });
  }
}
