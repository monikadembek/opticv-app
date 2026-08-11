import { inject, Injectable } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { NotificationType, UsageStatus, UserProfile } from '@opticv/datatypes';
import { environment } from '../../../environments/environment';

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

  updateDisplayName(displayName: string): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `${environment.apiUrl}/users/me/display-name`,
      { displayName },
    );
  }

  updateNotificationPreference(
    type: NotificationType,
    enabled: boolean,
  ): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `${environment.apiUrl}/users/me/notifications`,
      { type, enabled },
    );
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/me`);
  }

  createCheckoutSession(tier: 'BASIC' | 'PRO'): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/stripe/checkout-session`,
      { tier },
    );
  }

  createPortalSession(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/stripe/portal-session`,
      {},
    );
  }
}
