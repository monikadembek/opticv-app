import { inject, Injectable } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { UsageStatus, UserProfile } from '@opticv/datatypes';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserSettingsApiService {
  private readonly http = inject(HttpClient);

  #userProfile = httpResource<UserProfile | null>(
    () => ({
      url: `${environment.apiUrl}/users/me`,
    }),
    { defaultValue: null },
  );

  userProfile = this.#userProfile.asReadonly();

  #usageStatus = httpResource<UsageStatus | null>(
    () => ({
      url: `${environment.apiUrl}/users/me/usage`,
    }),
    { defaultValue: null },
  );

  usageStatus = this.#usageStatus.asReadonly();

  reloadUserProfile(): void {
    this.#userProfile.reload();
  }

  reloadUsageStatus(): void {
    this.#usageStatus.reload();
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/me`);
  }
}
