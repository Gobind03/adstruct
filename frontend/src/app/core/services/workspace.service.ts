import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  currency: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  market: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private _currentOrg = signal<Organization | null>(null);
  private _currentWorkspace = signal<Workspace | null>(null);

  readonly currentOrg = this._currentOrg.asReadonly();
  readonly currentWorkspace = this._currentWorkspace.asReadonly();

  constructor(private http: HttpClient) {}

  loadOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${environment.apiUrl}/organizations`);
  }

  loadWorkspaces(orgId: string): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(
      `${environment.apiUrl}/organizations/${orgId}/workspaces`
    );
  }

  selectOrg(org: Organization): void {
    this._currentOrg.set(org);
  }

  selectWorkspace(ws: Workspace): void {
    this._currentWorkspace.set(ws);
  }
}
