import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { IntegrationResourceResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class IntegrationResourcesApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(orgId: string, accountId: string): Observable<IntegrationResourceResponse[]> {
    return this.http.get<IntegrationResourceResponse[]>(
      `${this.base}/orgs/${orgId}/integrations/accounts/${accountId}/resources`
    );
  }

  discover(orgId: string, accountId: string): Observable<IntegrationResourceResponse[]> {
    return this.http.post<IntegrationResourceResponse[]>(
      `${this.base}/orgs/${orgId}/integrations/accounts/${accountId}/discover`,
      {}
    );
  }

  update(orgId: string, resourceId: string, body: unknown): Observable<IntegrationResourceResponse> {
    return this.http.patch<IntegrationResourceResponse>(
      `${this.base}/orgs/${orgId}/integrations/resources/${resourceId}`,
      body
    );
  }
}
