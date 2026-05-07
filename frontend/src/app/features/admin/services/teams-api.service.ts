import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Team, TeamCreateRequest, TeamMember } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class TeamsApiService {
  constructor(private http: HttpClient) {}

  private base(orgId: string): string {
    return `${environment.apiUrl}/organizations/${orgId}/teams`;
  }

  list(orgId: string, workspaceId?: string): Observable<Team[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    return this.http.get<Team[]>(this.base(orgId), { params });
  }

  get(orgId: string, teamId: string): Observable<Team> {
    return this.http.get<Team>(`${this.base(orgId)}/${teamId}`);
  }

  create(orgId: string, request: TeamCreateRequest): Observable<Team> {
    return this.http.post<Team>(this.base(orgId), request);
  }

  update(orgId: string, teamId: string, name: string): Observable<Team> {
    return this.http.patch<Team>(`${this.base(orgId)}/${teamId}`, { name });
  }

  delete(orgId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(orgId)}/${teamId}`);
  }

  addMember(orgId: string, teamId: string, userId: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.base(orgId)}/${teamId}/members`, { userId });
  }

  removeMember(orgId: string, teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(orgId)}/${teamId}/members/${userId}`);
  }
}
