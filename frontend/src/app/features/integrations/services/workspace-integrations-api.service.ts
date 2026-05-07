import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { WorkspaceIntegrationResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceIntegrationsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private workspaceIntegrationsPath(workspaceId: string): string {
    return `${this.base}/workspaces/${workspaceId}/integrations`;
  }

  list(workspaceId: string): Observable<WorkspaceIntegrationResponse[]> {
    return this.http.get<WorkspaceIntegrationResponse[]>(this.workspaceIntegrationsPath(workspaceId));
  }

  create(workspaceId: string, body: unknown): Observable<WorkspaceIntegrationResponse> {
    return this.http.post<WorkspaceIntegrationResponse>(this.workspaceIntegrationsPath(workspaceId), body);
  }

  update(workspaceId: string, id: string, body: unknown): Observable<WorkspaceIntegrationResponse> {
    return this.http.patch<WorkspaceIntegrationResponse>(
      `${this.workspaceIntegrationsPath(workspaceId)}/${id}`,
      body
    );
  }

  setDefault(workspaceId: string, id: string): Observable<WorkspaceIntegrationResponse> {
    return this.http.post<WorkspaceIntegrationResponse>(
      `${this.workspaceIntegrationsPath(workspaceId)}/${id}/set-default`,
      {}
    );
  }

  remove(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.workspaceIntegrationsPath(workspaceId)}/${id}`);
  }
}
