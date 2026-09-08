import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CvDocument,
  CvDocumentListItem,
  CvStructuredData,
} from '@opticv/datatypes';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CvApiService {
  private readonly http = inject(HttpClient);

  getUserCvs(): Observable<CvDocumentListItem[]> {
    return this.http.get<CvDocumentListItem[]>(`${environment.apiUrl}/cv`);
  }

  downloadCv(id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${environment.apiUrl}/cv/${id}/download`,
    );
  }

  deleteCv(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/cv/${id}`);
  }

  getStructuredData(id: string): Observable<{ data: CvStructuredData }> {
    return this.http.get<{ data: CvStructuredData }>(
      `${environment.apiUrl}/cv/${id}/structured-data`,
    );
  }

  createManualCv(data: CvStructuredData): Observable<CvDocument> {
    return this.http.post<CvDocument>(`${environment.apiUrl}/cv/manual`, data);
  }

  updateStructuredData(
    id: string,
    data: CvStructuredData,
  ): Observable<CvDocument> {
    return this.http.patch<CvDocument>(
      `${environment.apiUrl}/cv/${id}/structured-data`,
      data,
    );
  }
}
