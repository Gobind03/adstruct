import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  AiWorkspacePreference,
  AiWorkspacePreferenceCreateRequest,
  AiWorkspacePreferencePatchRequest,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiPreferencesApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(wsId: string): string {
    return `${this.base}/workspaces/${wsId}/ai/provider-preferences`;
  }

  list(wsId: string): Observable<AiWorkspacePreference[]> {
    return this.http.get<AiWorkspacePreference[]>(this.path(wsId));
  }

  create(wsId: string, body: AiWorkspacePreferenceCreateRequest): Observable<AiWorkspacePreference> {
    return this.http.post<AiWorkspacePreference>(this.path(wsId), body);
  }

  patch(wsId: string, prefId: string, body: AiWorkspacePreferencePatchRequest): Observable<AiWorkspacePreference> {
    return this.http.patch<AiWorkspacePreference>(`${this.path(wsId)}/${prefId}`, body);
  }

  setDefault(wsId: string, prefId: string): Observable<AiWorkspacePreference> {
    return this.http.post<AiWorkspacePreference>(`${this.path(wsId)}/${prefId}/set-default`, {});
  }
}
