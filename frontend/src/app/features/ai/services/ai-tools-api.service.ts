import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AiToolDefinition } from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiToolsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(wsId: string): Observable<AiToolDefinition[]> {
    return this.http.get<AiToolDefinition[]>(`${this.base}/workspaces/${wsId}/ai/tools`);
  }
}
