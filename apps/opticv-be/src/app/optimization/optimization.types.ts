import { PromptType } from '../../generated/prisma/enums.js';

export interface OptimizationJobPayload {
  runId: string;
  jobApplicationId: string;
  userId: string;
  promptType: PromptType;
  cvText: string;
  parsedSections: unknown;
  jobDescription: string;
}

export interface OptimizationJobEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
