import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CopyArtifactResponse, PagedResponse } from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeCopyApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative`;
  }

  listCopy(
    wsId: string,
    params?: {
      type?: string;
      status?: string;
      language?: string;
      q?: string;
      page?: number;
      size?: number;
    },
  ): Observable<PagedResponse<CopyArtifactResponse>> {
    let httpParams = new HttpParams();
    if (params?.type != null) {
      httpParams = httpParams.set('type', params.type);
    }
    if (params?.status != null) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.language != null) {
      httpParams = httpParams.set('language', params.language);
    }
    if (params?.q != null) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.size != null) {
      httpParams = httpParams.set('size', String(params.size));
    }
    return this.http.get<PagedResponse<CopyArtifactResponse>>(`${this.base(wsId)}/copy`, {
      params: httpParams,
    });
  }

  createCopy(wsId: string, body: unknown): Observable<CopyArtifactResponse> {
    return this.http.post<CopyArtifactResponse>(`${this.base(wsId)}/copy`, body);
  }

  getCopy(wsId: string, copyId: string): Observable<CopyArtifactResponse> {
    return this.http.get<CopyArtifactResponse>(`${this.base(wsId)}/copy/${copyId}`);
  }

  updateCopy(wsId: string, copyId: string, body: unknown): Observable<CopyArtifactResponse> {
    return this.http.patch<CopyArtifactResponse>(`${this.base(wsId)}/copy/${copyId}`, body);
  }

  archiveCopy(wsId: string, copyId: string): Observable<CopyArtifactResponse> {
    return this.http.post<CopyArtifactResponse>(`${this.base(wsId)}/copy/${copyId}/archive`, {});
  }

  runGovernanceCheck(wsId: string, copyId: string, body: unknown): Observable<CopyArtifactResponse> {
    return this.http.post<CopyArtifactResponse>(
      `${this.base(wsId)}/copy/${copyId}/governance-check`,
      body,
    );
  }
}
