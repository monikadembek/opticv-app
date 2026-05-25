import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { AppliedBullet, BulletUpgradeResult } from '@opticv/datatypes';
import { CvOptimizationApiService } from '../../services/cv-optimization-api.service';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

type BulletChoice = 'original' | 'rewrite';

interface BulletEditState {
  choice: BulletChoice;
  editedText: string;
  saving: boolean;
  error: string | null;
  success: boolean;
}

function bulletKey(positionIndex: number, bulletIndex: number): string {
  return `${positionIndex}-${bulletIndex}`;
}

@Component({
  imports: [ButtonModule, TextareaModule],
  selector: 'app-bullet-rewriter',
  templateUrl: './bullet-rewriter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulletRewriter {
  private readonly apiService = inject(CvOptimizationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly result = input.required<BulletUpgradeResult>();
  readonly optimizationResultId = input<string | null>(null);

  readonly bulletApplied = output<AppliedBullet>();

  readonly bulletStates = signal<Map<string, BulletEditState>>(new Map());

  getBulletState(
    positionIndex: number,
    bulletIndex: number,
    rewrittenText?: string,
  ): BulletEditState {
    const key = bulletKey(positionIndex, bulletIndex);
    const existing = this.bulletStates().get(key);
    if (existing) return existing;
    return {
      choice: 'rewrite',
      editedText: rewrittenText ?? '',
      saving: false,
      error: null,
      success: false,
    };
  }

  selectChoice(
    positionIndex: number,
    bulletIndex: number,
    choice: BulletChoice,
    originalText: string,
    rewrittenText: string,
  ): void {
    const key = bulletKey(positionIndex, bulletIndex);
    this.bulletStates.update((map) => {
      const next = new Map(map);
      const current = next.get(key);
      next.set(key, {
        ...(current ?? { saving: false, error: null, success: false }),
        choice,
        editedText: choice === 'rewrite' ? rewrittenText : originalText,
      });
      return next;
    });
  }

  onBulletInput(
    positionIndex: number,
    bulletIndex: number,
    value: string,
  ): void {
    const key = bulletKey(positionIndex, bulletIndex);
    this.bulletStates.update((map) => {
      const next = new Map(map);
      const current = next.get(key) ?? {
        choice: 'rewrite' as BulletChoice,
        editedText: '',
        saving: false,
        error: null,
        success: false,
      };
      next.set(key, { ...current, editedText: value });
      return next;
    });
  }

  applyBullet(positionIndex: number, bulletIndex: number): void {
    const resultId = this.optimizationResultId();
    if (!resultId) return;

    const key = bulletKey(positionIndex, bulletIndex);
    const rewrittenText =
      this.result().positions[positionIndex]?.bullets[bulletIndex]
        ?.rewrittenText ?? '';
    const state = this.bulletStates().get(key) ?? {
      choice: 'rewrite' as BulletChoice,
      editedText: rewrittenText,
      saving: false,
      error: null,
      success: false,
    };

    this.bulletStates.update((map) =>
      new Map(map).set(key, { ...state, saving: true, error: null }),
    );

    const currentBullets = this.buildAllAppliedBullets(
      positionIndex,
      bulletIndex,
      state.editedText,
    );
    const payload = JSON.stringify(currentBullets);

    this.apiService
      .saveUserOutput(resultId, payload)
      .pipe(
        finalize(() => this.updateBulletState(key, { saving: false })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.updateBulletState(key, { success: true });
          this.bulletApplied.emit({
            positionIndex,
            bulletIndex,
            text: state.editedText,
          });
          setTimeout(
            () => this.updateBulletState(key, { success: false }),
            2000,
          );
        },
        error: () =>
          this.updateBulletState(key, {
            error: 'Failed to save. Please try again.',
          }),
      });
  }

  private buildAllAppliedBullets(
    currentPositionIndex: number,
    currentBulletIndex: number,
    currentText: string,
  ): AppliedBullet[] {
    const result: AppliedBullet[] = [];

    for (const [key, state] of this.bulletStates()) {
      if (!state.success) continue;
      const [pi, bi] = key.split('-').map(Number);
      if (pi === currentPositionIndex && bi === currentBulletIndex) continue;
      result.push({
        positionIndex: pi,
        bulletIndex: bi,
        text: state.editedText,
      });
    }

    result.push({
      positionIndex: currentPositionIndex,
      bulletIndex: currentBulletIndex,
      text: currentText,
    });
    return result;
  }

  private updateBulletState(
    key: string,
    patch: Partial<BulletEditState>,
  ): void {
    this.bulletStates.update((map) => {
      const next = new Map(map);
      const current = next.get(key);
      if (current) {
        next.set(key, { ...current, ...patch });
      }
      return next;
    });
  }
}
