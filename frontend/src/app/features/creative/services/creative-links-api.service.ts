import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CreativeLinkResponse } from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeLinksApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative`;
  }

  createLink(wsId: string, body: unknown): Observable<CreativeLinkResponse> {
    return this.http.post<CreativeLinkResponse>(`${this.base(wsId)}/links`, body);
  }

  listLinks(
    wsId: string,
    params: {
      fromEntityType?: string;
      fromEntityId?: string;
      toEntityType?: string;
      toEntityId?: string;
    },
  ): Observable<CreativeLinkResponse[]> {
    let httpParams = new HttpParams();
    if (params.fromEntityType != null) {
      httpParams = httpParams.set('fromEntityType', params.fromEntityType);
    }
    if (params.fromEntityId != null) {
      httpParams = httpParams.set('fromEntityId', params.fromEntityId);
    }
    if (params.toEntityType != null) {
      httpParams = httpParams.set('toEntityType', params.toEntityType);
    }
    if (params.toEntityId != null) {
      httpParams = httpParams.set('toEntityId', params.toEntityId);
    }
    return this.http.get<CreativeLinkResponse[]>(`${this.base(wsId)}/links`, {
      params: httpParams,
    });
  }

  deleteLink(wsId: string, linkId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/links/${linkId}`);
  }
}
