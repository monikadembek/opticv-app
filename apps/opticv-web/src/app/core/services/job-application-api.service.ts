import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { JobApplicationListItem, JobApplicationWithCv } from '@opticv/datatypes';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JobApplicationApiService {
  private readonly http = inject(HttpClient);

  getJobApplications(): Observable<{ data: JobApplicationListItem[]; total: number }> {
    return this.http.get<{ data: JobApplicationListItem[]; total: number }>(
      `${environment.apiUrl}/job-applications`,
    );
  }

  getJobApplication(id: string): Observable<JobApplicationWithCv> {
    return this.http.get<JobApplicationWithCv>(
      `${environment.apiUrl}/job-applications/${id}`,
    );
  }

  deleteJobApplication(id: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/job-applications/${id}`,
    );
  }
}
