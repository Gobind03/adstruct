import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import {
  IntegrationAccountCreateRequest,
  IntegrationAccountResponse,
} from '@shared/models/api.models';

export interface IntegrationAccountsListParams {
  platformType?: string;
  status?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationAccountsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private accountsPath(orgId: string): string {
    return `${this.base}/orgs/${orgId}/integrations/accounts`;
  }

  list(orgId: string, params?: IntegrationAccountsListParams): Observable<IntegrationAccountResponse[]> {
    let httpParams = new HttpParams();
    if (params?.platformType) {
      httpParams = httpParams.set('platformType', params.platformType);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.category) {
      httpParams = httpParams.set('category', params.category);
    }
    return this.http.get<IntegrationAccountResponse[]>(this.accountsPath(orgId), {
      params: httpParams,
    });
  }

  create(orgId: string, body: IntegrationAccountCreateRequest): Observable<IntegrationAccountResponse> {
    return this.http.post<IntegrationAccountResponse>(this.accountsPath(orgId), body);
  }

  getById(orgId: string, accountId: string): Observable<IntegrationAccountResponse> {
    return this.http.get<IntegrationAccountResponse>(`${this.accountsPath(orgId)}/${accountId}`);
  }

  update(orgId: string, accountId: string, body: unknown): Observable<IntegrationAccountResponse> {
    return this.http.patch<IntegrationAccountResponse>(
      `${this.accountsPath(orgId)}/${accountId}`,
      body
    );
  }

  rotateSecrets(orgId: string, accountId: string, body: unknown): Observable<IntegrationAccountResponse> {
    return this.http.post<IntegrationAccountResponse>(
      `${this.accountsPath(orgId)}/${accountId}/secrets/rotate`,
      body
    );
  }

  validate(orgId: string, accountId: string): Observable<IntegrationAccountResponse> {
    return this.http.post<IntegrationAccountResponse>(
      `${this.accountsPath(orgId)}/${accountId}/validate`,
      {}
    );
  }

  disconnect(orgId: string, accountId: string): Observable<IntegrationAccountResponse> {
    return this.http.post<IntegrationAccountResponse>(
      `${this.accountsPath(orgId)}/${accountId}/disconnect`,
      {}
    );
  }
}
