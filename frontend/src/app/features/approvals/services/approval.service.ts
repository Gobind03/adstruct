import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApprovalResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class ApprovalApiService {
  private baseUrl = `${environment.apiUrl}/approvals`;

  constructor(private http: HttpClient) {}

  submit(entityType: string, entityId: string): Observable<ApprovalResponse> {
    return this.http.post<ApprovalResponse>(`${this.baseUrl}/submit`, { entityType, entityId });
  }

  listPending(): Observable<ApprovalResponse[]> {
    return this.http.get<ApprovalResponse[]>(`${this.baseUrl}/pending`);
  }

  approve(id: string, notes?: string): Observable<ApprovalResponse> {
    return this.http.post<ApprovalResponse>(`${this.baseUrl}/${id}/approve`, { notes });
  }

  reject(id: string, notes?: string): Observable<ApprovalResponse> {
    return this.http.post<ApprovalResponse>(`${this.baseUrl}/${id}/reject`, { notes });
  }
}
