import { inject, Injectable } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CvDocumentListItem,
  CvStructuredData,
  JobApplicationResponse,
} from '@opticv/datatypes';
import { environment } from '../../../../environments/environment';

export interface CreateJobApplicationPayload {
  cvDocumentId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CvOptimizationApiService {
  private readonly http = inject(HttpClient);

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
}
