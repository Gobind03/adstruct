import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  AiProviderConfig,
  AiProviderConfigCreateRequest,
  AiProviderConfigPatchRequest,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiProvidersApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(orgId: string): string {
    return `${this.base}/orgs/${orgId}/ai/providers`;
  }

  list(orgId: string): Observable<AiProviderConfig[]> {
    return this.http.get<AiProviderConfig[]>(this.path(orgId));
  }

  create(orgId: string, body: AiProviderConfigCreateRequest): Observable<AiProviderConfig> {
    return this.http.post<AiProviderConfig>(this.path(orgId), body);
  }

  patch(orgId: string, configId: string, body: AiProviderConfigPatchRequest): Observable<AiProviderConfig> {
    return this.http.patch<AiProviderConfig>(`${this.path(orgId)}/${configId}`, body);
  }

  disable(orgId: string, configId: string): Observable<AiProviderConfig> {
    return this.http.post<AiProviderConfig>(`${this.path(orgId)}/${configId}/disable`, {});
  }
}
