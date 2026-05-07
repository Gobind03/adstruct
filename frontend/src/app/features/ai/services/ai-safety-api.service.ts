import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  AiRedactionRule,
  AiRedactionRuleCreateRequest,
  AiRedactionRulePatchRequest,
  AiSafetyPolicy,
  AiSafetyPolicyPatchRequest,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiSafetyApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private root(wsId: string): string {
    return `${this.base}/workspaces/${wsId}/ai/safety`;
  }

  getPolicy(wsId: string): Observable<AiSafetyPolicy> {
    return this.http.get<AiSafetyPolicy>(`${this.root(wsId)}/policy`);
  }

  patchPolicy(wsId: string, body: AiSafetyPolicyPatchRequest): Observable<AiSafetyPolicy> {
    return this.http.patch<AiSafetyPolicy>(`${this.root(wsId)}/policy`, body);
  }

  listRedactionRules(wsId: string): Observable<AiRedactionRule[]> {
    return this.http.get<AiRedactionRule[]>(`${this.root(wsId)}/redaction-rules`);
  }

  createRedactionRule(wsId: string, body: AiRedactionRuleCreateRequest): Observable<AiRedactionRule> {
    return this.http.post<AiRedactionRule>(`${this.root(wsId)}/redaction-rules`, body);
  }

  patchRedactionRule(
    wsId: string,
    ruleId: string,
    body: AiRedactionRulePatchRequest
  ): Observable<AiRedactionRule> {
    return this.http.patch<AiRedactionRule>(`${this.root(wsId)}/redaction-rules/${ruleId}`, body);
  }

  deleteRedactionRule(wsId: string, ruleId: string): Observable<void> {
    return this.http.delete<void>(`${this.root(wsId)}/redaction-rules/${ruleId}`);
  }
}
