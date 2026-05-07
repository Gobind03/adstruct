import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  TemplateResponse,
  TemplateCreateRequest,
  TemplatePatchRequest,
  TemplateUsageResponse,
  TemplateUsageRequest,
} from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class TemplatesApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(orgId: string, workspaceId?: string, type?: string, status?: string): Observable<TemplateResponse[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    if (type) params = params.set('type', type);
    if (status) params = params.set('status', status);
    return this.http.get<TemplateResponse[]>(`${this.base}/orgs/${orgId}/templates`, { params });
  }

  get(orgId: string, templateId: string): Observable<TemplateResponse> {
    return this.http.get<TemplateResponse>(`${this.base}/orgs/${orgId}/templates/${templateId}`);
  }

  create(orgId: string, req: TemplateCreateRequest): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(`${this.base}/orgs/${orgId}/templates`, req);
  }

  patch(orgId: string, templateId: string, req: TemplatePatchRequest): Observable<TemplateResponse> {
    return this.http.patch<TemplateResponse>(`${this.base}/orgs/${orgId}/templates/${templateId}`, req);
  }

  submit(orgId: string, templateId: string): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(`${this.base}/orgs/${orgId}/templates/${templateId}/submit`, {});
  }

  approve(orgId: string, templateId: string, notes?: string): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(
      `${this.base}/orgs/${orgId}/templates/${templateId}/approve`,
      notes || ''
    );
  }

  reject(orgId: string, templateId: string, notes?: string): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(
      `${this.base}/orgs/${orgId}/templates/${templateId}/reject`,
      notes || ''
    );
  }

  newVersion(orgId: string, templateId: string): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(
      `${this.base}/orgs/${orgId}/templates/${templateId}/new-version`,
      {}
    );
  }

  archive(orgId: string, templateId: string): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(`${this.base}/orgs/${orgId}/templates/${templateId}/archive`, {});
  }

  recordUsage(orgId: string, templateId: string, req: TemplateUsageRequest): Observable<TemplateUsageResponse> {
    return this.http.post<TemplateUsageResponse>(
      `${this.base}/orgs/${orgId}/templates/${templateId}/record-usage`,
      req
    );
  }
}
