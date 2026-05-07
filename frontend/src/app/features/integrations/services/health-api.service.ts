import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { HealthSummaryResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  get(orgId: string, accountId: string): Observable<HealthSummaryResponse> {
    return this.http.get<HealthSummaryResponse>(
      `${this.base}/orgs/${orgId}/integrations/accounts/${accountId}/health`
    );
  }
}
