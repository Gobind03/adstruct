import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  BrandRuleSetResponse,
  BrandRuleSetCreateRequest,
  BrandRuleResponse,
  BrandRuleCreateRequest,
} from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class RulesetsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(orgId: string, workspaceId?: string, status?: string): Observable<BrandRuleSetResponse[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    if (status) params = params.set('status', status);
    return this.http.get<BrandRuleSetResponse[]>(`${this.base}/orgs/${orgId}/rulesets`, { params });
  }

  get(orgId: string, ruleSetId: string): Observable<BrandRuleSetResponse> {
    return this.http.get<BrandRuleSetResponse>(`${this.base}/orgs/${orgId}/rulesets/${ruleSetId}`);
  }

  create(orgId: string, req: BrandRuleSetCreateRequest): Observable<BrandRuleSetResponse> {
    return this.http.post<BrandRuleSetResponse>(`${this.base}/orgs/${orgId}/rulesets`, req);
  }

  patch(orgId: string, ruleSetId: string, req: Partial<BrandRuleSetResponse>): Observable<BrandRuleSetResponse> {
    return this.http.patch<BrandRuleSetResponse>(`${this.base}/orgs/${orgId}/rulesets/${ruleSetId}`, req);
  }

  archive(orgId: string, ruleSetId: string): Observable<BrandRuleSetResponse> {
    return this.http.post<BrandRuleSetResponse>(`${this.base}/orgs/${orgId}/rulesets/${ruleSetId}/archive`, {});
  }

  cloneToWorkspace(orgId: string, ruleSetId: string, workspaceId: string): Observable<BrandRuleSetResponse> {
    return this.http.post<BrandRuleSetResponse>(
      `${this.base}/orgs/${orgId}/rulesets/${ruleSetId}/clone-to-workspace?workspaceId=${workspaceId}`,
      {}
    );
  }

  listRules(ruleSetId: string): Observable<BrandRuleResponse[]> {
    return this.http.get<BrandRuleResponse[]>(`${this.base}/rulesets/${ruleSetId}/rules`);
  }

  createRule(ruleSetId: string, req: BrandRuleCreateRequest): Observable<BrandRuleResponse> {
    return this.http.post<BrandRuleResponse>(`${this.base}/rulesets/${ruleSetId}/rules`, req);
  }

  patchRule(ruleSetId: string, ruleId: string, req: Partial<BrandRuleResponse>): Observable<BrandRuleResponse> {
    return this.http.patch<BrandRuleResponse>(`${this.base}/rulesets/${ruleSetId}/rules/${ruleId}`, req);
  }

  deleteRule(ruleSetId: string, ruleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/rulesets/${ruleSetId}/rules/${ruleId}`);
  }
}
