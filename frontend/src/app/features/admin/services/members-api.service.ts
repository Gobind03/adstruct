import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  MemberDetail,
  MemberCreateRequest,
  MemberUpdateRequest,
  MemberRole,
  UserStatus,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class MembersApiService {
  constructor(private http: HttpClient) {}

  private base(orgId: string): string {
    return `${environment.apiUrl}/organizations/${orgId}/members`;
  }

  list(
    orgId: string,
    workspaceId?: string,
    role?: MemberRole,
    status?: UserStatus,
    query?: string
  ): Observable<MemberDetail[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    if (role) params = params.set('role', role);
    if (status) params = params.set('status', status);
    if (query) params = params.set('query', query);
    return this.http.get<MemberDetail[]>(this.base(orgId), { params });
  }

  create(orgId: string, request: MemberCreateRequest): Observable<MemberDetail> {
    return this.http.post<MemberDetail>(this.base(orgId), request);
  }

  updateRole(orgId: string, membershipId: string, request: MemberUpdateRequest): Observable<MemberDetail> {
    return this.http.patch<MemberDetail>(`${this.base(orgId)}/${membershipId}`, request);
  }

  remove(orgId: string, membershipId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(orgId)}/${membershipId}`);
  }
}
