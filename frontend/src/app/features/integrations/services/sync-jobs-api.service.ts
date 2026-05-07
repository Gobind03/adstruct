import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { SyncJobResponse } from '@shared/models/api.models';

export interface SyncJobsListParams {
  accountId?: string;
  workspaceId?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class SyncJobsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private syncJobsPath(orgId: string): string {
    return `${this.base}/orgs/${orgId}/integrations/sync-jobs`;
  }

  list(orgId: string, params?: SyncJobsListParams): Observable<SyncJobResponse[]> {
    let httpParams = new HttpParams();
    if (params?.accountId) {
      httpParams = httpParams.set('accountId', params.accountId);
    }
    if (params?.workspaceId) {
      httpParams = httpParams.set('workspaceId', params.workspaceId);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<SyncJobResponse[]>(this.syncJobsPath(orgId), { params: httpParams });
  }

  create(orgId: string, body: unknown): Observable<SyncJobResponse> {
    return this.http.post<SyncJobResponse>(this.syncJobsPath(orgId), body);
  }

  run(orgId: string, jobId: string): Observable<SyncJobResponse> {
    return this.http.post<SyncJobResponse>(`${this.syncJobsPath(orgId)}/${jobId}/run`, {});
  }
}
