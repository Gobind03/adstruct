import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuditLogEntry, PagedResponse } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  constructor(private http: HttpClient) {}

  list(
    orgId: string,
    page: number = 0,
    size: number = 20,
    filters?: {
      workspaceId?: string;
      actorUserId?: string;
      entityType?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Observable<PagedResponse<AuditLogEntry>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters?.workspaceId) params = params.set('workspaceId', filters.workspaceId);
    if (filters?.actorUserId) params = params.set('actorUserId', filters.actorUserId);
    if (filters?.entityType) params = params.set('entityType', filters.entityType);
    if (filters?.action) params = params.set('action', filters.action);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);
    return this.http.get<PagedResponse<AuditLogEntry>>(
      `${environment.apiUrl}/organizations/${orgId}/audit`,
      { params }
    );
  }
}
