import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  AiWorkflowCreateRequest,
  AiWorkflowDefinition,
  AiWorkflowListParams,
  AiWorkflowRun,
  AiWorkflowRunRequest,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiWorkflowsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(orgId: string): string {
    return `${this.base}/orgs/${orgId}/ai/workflows`;
  }

  list(orgId: string, params?: AiWorkflowListParams): Observable<AiWorkflowDefinition[]> {
    let httpParams = new HttpParams();
    if (params?.scope) httpParams = httpParams.set('scope', params.scope);
    if (params?.workspaceId) httpParams = httpParams.set('workspaceId', params.workspaceId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<AiWorkflowDefinition[]>(this.path(orgId), { params: httpParams });
  }

  /** Resolves a workflow by listing org workflows (no single-GET API). */
  get(orgId: string, workflowId: string): Observable<AiWorkflowDefinition | null> {
    return this.list(orgId).pipe(
      map((list) => list.find((w) => w.id === workflowId) ?? null)
    );
  }

  create(orgId: string, body: AiWorkflowCreateRequest): Observable<AiWorkflowDefinition> {
    return this.http.post<AiWorkflowDefinition>(this.path(orgId), body);
  }

  run(orgId: string, workflowId: string, wsId: string, body: AiWorkflowRunRequest): Observable<AiWorkflowRun> {
    const params = new HttpParams().set('workspaceId', wsId);
    return this.http.post<AiWorkflowRun>(`${this.path(orgId)}/${workflowId}/run`, body, { params });
  }
}
