import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { PlatformEntityMappingResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class MappingsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private mappingsPath(workspaceId: string): string {
    return `${this.base}/workspaces/${workspaceId}/mappings`;
  }

  getByInternal(
    workspaceId: string,
    type: string,
    entityId: string
  ): Observable<PlatformEntityMappingResponse[]> {
    const params = new HttpParams()
      .set('internalEntityType', type)
      .set('internalEntityId', entityId);
    return this.http.get<PlatformEntityMappingResponse[]>(`${this.mappingsPath(workspaceId)}/internal`, {
      params,
    });
  }

  getByExternal(
    workspaceId: string,
    accountId: string,
    type: string,
    entityId: string
  ): Observable<PlatformEntityMappingResponse[]> {
    const params = new HttpParams()
      .set('accountId', accountId)
      .set('externalEntityType', type)
      .set('externalEntityId', entityId);
    return this.http.get<PlatformEntityMappingResponse[]>(`${this.mappingsPath(workspaceId)}/external`, {
      params,
    });
  }

  create(workspaceId: string, body: unknown): Observable<PlatformEntityMappingResponse> {
    return this.http.post<PlatformEntityMappingResponse>(this.mappingsPath(workspaceId), body);
  }

  remove(workspaceId: string, mappingId: string): Observable<void> {
    return this.http.delete<void>(`${this.mappingsPath(workspaceId)}/${mappingId}`);
  }
}
