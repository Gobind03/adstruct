import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CreativeUsageResponse } from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeUsageApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative`;
  }

  createUsage(wsId: string, body: unknown): Observable<CreativeUsageResponse> {
    return this.http.post<CreativeUsageResponse>(`${this.base(wsId)}/usage`, body);
  }

  listUsage(
    wsId: string,
    params: {
      creativeEntityType?: string;
      creativeEntityId?: string;
      usedEntityType?: string;
      usedEntityId?: string;
    },
  ): Observable<CreativeUsageResponse[]> {
    let httpParams = new HttpParams();
    if (params.creativeEntityType != null) {
      httpParams = httpParams.set('creativeEntityType', params.creativeEntityType);
    }
    if (params.creativeEntityId != null) {
      httpParams = httpParams.set('creativeEntityId', params.creativeEntityId);
    }
    if (params.usedEntityType != null) {
      httpParams = httpParams.set('usedEntityType', params.usedEntityType);
    }
    if (params.usedEntityId != null) {
      httpParams = httpParams.set('usedEntityId', params.usedEntityId);
    }
    return this.http.get<CreativeUsageResponse[]>(`${this.base(wsId)}/usage`, {
      params: httpParams,
    });
  }
}
