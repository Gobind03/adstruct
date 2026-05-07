import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  AiPromptCreateRequest,
  AiPromptListParams,
  AiPromptPatchRequest,
  AiPromptRun,
  AiPromptRunRequest,
  AiPromptTemplate,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiPromptsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(orgId: string): string {
    return `${this.base}/orgs/${orgId}/ai/prompts`;
  }

  list(orgId: string, params?: AiPromptListParams): Observable<AiPromptTemplate[]> {
    let httpParams = new HttpParams();
    if (params?.scope) httpParams = httpParams.set('scope', params.scope);
    if (params?.workspaceId) httpParams = httpParams.set('workspaceId', params.workspaceId);
    if (params?.purpose) httpParams = httpParams.set('purpose', params.purpose);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.tag) httpParams = httpParams.set('tag', params.tag);
    return this.http.get<AiPromptTemplate[]>(this.path(orgId), { params: httpParams });
  }

  create(orgId: string, body: AiPromptCreateRequest): Observable<AiPromptTemplate> {
    return this.http.post<AiPromptTemplate>(this.path(orgId), body);
  }

  get(orgId: string, promptId: string): Observable<AiPromptTemplate> {
    return this.http.get<AiPromptTemplate>(`${this.path(orgId)}/${promptId}`);
  }

  patch(orgId: string, promptId: string, body: AiPromptPatchRequest): Observable<AiPromptTemplate> {
    return this.http.patch<AiPromptTemplate>(`${this.path(orgId)}/${promptId}`, body);
  }

  submit(orgId: string, promptId: string): Observable<AiPromptTemplate> {
    return this.http.post<AiPromptTemplate>(`${this.path(orgId)}/${promptId}/submit`, {});
  }

  approve(orgId: string, promptId: string): Observable<AiPromptTemplate> {
    return this.http.post<AiPromptTemplate>(`${this.path(orgId)}/${promptId}/approve`, {});
  }

  archive(orgId: string, promptId: string): Observable<AiPromptTemplate> {
    return this.http.post<AiPromptTemplate>(`${this.path(orgId)}/${promptId}/archive`, {});
  }

  run(orgId: string, promptId: string, wsId: string, body: AiPromptRunRequest): Observable<AiPromptRun> {
    const params = new HttpParams().set('workspaceId', wsId);
    return this.http.post<AiPromptRun>(`${this.path(orgId)}/${promptId}/run`, body, { params });
  }
}
