import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { UploadCvResponse } from '@opticv/datatypes';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CvUploadApiService {
  private readonly http = inject(HttpClient);

  uploadCv(file: File): Observable<UploadCvResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadCvResponse>(
      `${environment.apiUrl}/cv/upload`,
      formData,
    );
  }
}
