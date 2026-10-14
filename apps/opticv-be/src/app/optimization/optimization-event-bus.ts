import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { PromptType } from '../../generated/prisma/enums.js';
import type { OptimizationJobEvent } from './optimization.types.js';

interface RunState {
  expected: number;
  seen: Set<PromptType>;
}

@Injectable()
export class OptimizationEventBus {
  private readonly emitter = new EventEmitter();
  // In-process, like the emitter itself: a run's state is lost on restart.
  private readonly runs = new Map<string, RunState>();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  registerRun(runId: string, expected: number): void {
    this.runs.set(runId, { expected, seen: new Set() });
  }

  emit(runId: string, event: OptimizationJobEvent): void {
    // Distinct prompt types, not raw events: a BullMQ retry can re-emit a
    // terminal event for a prompt that already reported.
    this.runs.get(runId)?.seen.add(event.promptType);
    this.emitter.emit(`run:${runId}`, event);
    // Listeners run synchronously above, so they have already observed the
    // completed state; drop it now so runs nobody streams do not accumulate.
    if (this.isRunComplete(runId)) {
      this.releaseRun(runId);
    }
  }

  isRunComplete(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;
    return run.seen.size >= run.expected;
  }

  releaseRun(runId: string): void {
    this.runs.delete(runId);
  }

  subscribe(
    runId: string,
    handler: (event: OptimizationJobEvent) => void,
  ): () => void {
    const channel = `run:${runId}`;
    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }
}
