import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { OptimizationJobEvent } from './optimization.types.js';

@Injectable()
export class OptimizationEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(runId: string, event: OptimizationJobEvent): void {
    this.emitter.emit(`run:${runId}`, event);
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
