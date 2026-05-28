import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CvDocumentListItem } from '@opticv/datatypes';
import { environment } from '../../../../environments/environment';

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
}
