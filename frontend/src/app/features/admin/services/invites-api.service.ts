import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Invite, InviteCreateRequest, InviteAcceptRequest, InviteStatus } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class InvitesApiService {
  constructor(private http: HttpClient) {}

  private base(orgId: string): string {
    return `${environment.apiUrl}/organizations/${orgId}/invites`;
  }

  list(orgId: string, status?: InviteStatus, workspaceId?: string): Observable<Invite[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    return this.http.get<Invite[]>(this.base(orgId), { params });
  }

  create(orgId: string, request: InviteCreateRequest): Observable<Invite> {
    return this.http.post<Invite>(this.base(orgId), request);
  }

  accept(request: InviteAcceptRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/invites/accept`, request);
  }

  revoke(orgId: string, inviteId: string): Observable<Invite> {
    return this.http.post<Invite>(`${this.base(orgId)}/${inviteId}/revoke`, {});
  }

  resend(orgId: string, inviteId: string): Observable<Invite> {
    return this.http.post<Invite>(`${this.base(orgId)}/${inviteId}/resend`, {});
  }
}
