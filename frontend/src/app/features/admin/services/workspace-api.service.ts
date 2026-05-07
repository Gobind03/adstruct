import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Workspace, WorkspaceCreateRequest, WorkspaceUpdateRequest } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  constructor(private http: HttpClient) {}

  private base(orgId: string): string {
    return `${environment.apiUrl}/organizations/${orgId}/workspaces`;
  }

  list(orgId: string, status?: string, name?: string): Observable<Workspace[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (name) params = params.set('name', name);
    return this.http.get<Workspace[]>(this.base(orgId), { params });
  }

  get(orgId: string, workspaceId: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.base(orgId)}/${workspaceId}`);
  }

  create(orgId: string, request: WorkspaceCreateRequest): Observable<Workspace> {
    return this.http.post<Workspace>(this.base(orgId), request);
  }

  update(orgId: string, workspaceId: string, request: WorkspaceUpdateRequest): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.base(orgId)}/${workspaceId}`, request);
  }

  archive(orgId: string, workspaceId: string): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.base(orgId)}/${workspaceId}/archive`, {});
  }

  restore(orgId: string, workspaceId: string): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.base(orgId)}/${workspaceId}/restore`, {});
  }
}
