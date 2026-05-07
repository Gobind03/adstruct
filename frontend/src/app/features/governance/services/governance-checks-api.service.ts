import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { GovernanceCheckRequest, GovernanceCheckRunResponse } from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class GovernanceChecksApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  runCheck(workspaceId: string, req: GovernanceCheckRequest): Observable<GovernanceCheckRunResponse> {
    return this.http.post<GovernanceCheckRunResponse>(
      `${this.base}/workspaces/${workspaceId}/governance/check`,
      req
    );
  }

  /**
   * Lists check runs for the workspace. When both entityType and entityId are set, filters to that entity.
   */
  list(
    workspaceId: string,
    entityType?: string,
    entityId?: string
  ): Observable<GovernanceCheckRunResponse[]> {
    let params = new HttpParams();
    if (entityType && entityId) {
      params = params.set('entityType', entityType).set('entityId', entityId);
    }
    return this.http.get<GovernanceCheckRunResponse[]>(
      `${this.base}/workspaces/${workspaceId}/governance/checks`,
      { params }
    );
  }

  get(workspaceId: string, checkRunId: string): Observable<GovernanceCheckRunResponse> {
    return this.http.get<GovernanceCheckRunResponse>(
      `${this.base}/workspaces/${workspaceId}/governance/checks/${checkRunId}`
    );
  }
}
