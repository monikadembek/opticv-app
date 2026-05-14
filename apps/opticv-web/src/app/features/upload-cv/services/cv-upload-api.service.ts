import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { UploadCvResponse } from '@opticv/datatypes';

@Injectable({ providedIn: 'root' })
export class CvUploadApiService {
  private readonly http = inject(HttpClient);

  uploadCv(file: File): Observable<UploadCvResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadCvResponse>('/api/cv/upload', formData);
  }
}
