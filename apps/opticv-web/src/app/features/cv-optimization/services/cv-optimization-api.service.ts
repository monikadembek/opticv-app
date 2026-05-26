import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import type {
  CvDocumentListItem,
  CvStructuredData,
  JobApplicationResponse,
  OptimizationResultSummary,
} from '@opticv/datatypes';
import { PromptType } from '@opticv/datatypes';
import { environment } from '../../../../environments/environment';
import { Supabase } from '../../../core/auth/services/supabase';

export interface CreateJobApplicationPayload {
  cvDocumentId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  notes?: string;
}

export interface SseJobCompleteEvent {
  promptType: PromptType;
  status: 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CvOptimizationApiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(Supabase);

  #cvList = httpResource<CvDocumentListItem[]>(
    () => ({
      url: `${environment.apiUrl}/cv`,
    }),
    { defaultValue: [] },
  );

  cvList = this.#cvList.asReadonly();

  reloadCvList(): void {
    this.#cvList.reload();
  }

  createJobApplication(
    payload: CreateJobApplicationPayload,
  ): Observable<JobApplicationResponse> {
    return this.http.post<JobApplicationResponse>(
      `${environment.apiUrl}/job-applications`,
      payload,
    );
  }

  extractCvData(cvId: string): Observable<{ data: CvStructuredData }> {
    return this.http.post<{ data: CvStructuredData }>(
      `${environment.apiUrl}/cv/${cvId}/extract`,
      {},
    );
  }

  runFullOptimizationProcess(
    jobApplicationId: string,
  ): Observable<{ runId: string }> {
    return this.http.post<{ runId: string }>(
      `${environment.apiUrl}/optimizations/job-applications/${jobApplicationId}/run`,
      {},
    );
  }

  runSingleOptimizationProcess(
    jobApplicationId: string,
    promptType: string,
  ): Observable<{ runId: string }> {
    return this.http.post<{ runId: string }>(
      `${environment.apiUrl}/optimizations/job-applications/${jobApplicationId}/run/${promptType}`,
      {},
    );
  }

  getOptimizationResults(
    jobApplicationId: string,
  ): Observable<OptimizationResultSummary[]> {
    return this.http.get<OptimizationResultSummary[]>(
      `${environment.apiUrl}/optimizations/job-applications/${jobApplicationId}/results`,
    );
  }

  saveUserOutput(
    optimizationResultId: string,
    userEditedOutput: string,
  ): Observable<{ userEditedOutput: string }> {
    return this.http.patch<{ userEditedOutput: string }>(
      `${environment.apiUrl}/optimizations/${optimizationResultId}/user-output`,
      { userEditedOutput },
    );
  }

  streamOptimizationEvents(
    jobApplicationId: string,
    runId: string,
  ): Observable<SseJobCompleteEvent> {
    if (!isPlatformBrowser(this.platformId)) {
      return EMPTY;
    }

    return new Observable<SseJobCompleteEvent>((observer) => {
      const token = this.supabase.currentSession()?.access_token ?? '';
      const url = `${environment.apiUrl}/optimizations/job-applications/${jobApplicationId}/stream?runId=${runId}&token=${token}`;
      const es = new EventSource(url);

      es.addEventListener('job-complete', (e: MessageEvent) => {
        const parsed = JSON.parse(e.data) as SseJobCompleteEvent;
        observer.next(parsed);
        observer.complete();
        es.close();
      });

      es.onerror = (err) => {
        observer.error(err);
        es.close();
      };

      // Teardown: close the connection when the Observable is unsubscribed
      return () => es.close();
    });
  }
}
