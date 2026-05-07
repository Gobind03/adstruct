import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  CreativeAiRunLinkResponse,
  EnrichAssetResponse,
  GenerateCopyResponse,
  GenerateHooksResponse,
  GenerateUgcBriefResponse,
  GenerateVideoScriptResponse,
} from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeAiApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative/ai`;
  }

  generateCopy(wsId: string, body: unknown): Observable<GenerateCopyResponse> {
    return this.http.post<GenerateCopyResponse>(`${this.base(wsId)}/copy/generate`, body);
  }

  generateHooks(wsId: string, body: unknown): Observable<GenerateHooksResponse> {
    return this.http.post<GenerateHooksResponse>(
      `${this.base(wsId)}/copy/hooks-angles-ctas`,
      body,
    );
  }

  generateVideoScript(wsId: string, body: unknown): Observable<GenerateVideoScriptResponse> {
    return this.http.post<GenerateVideoScriptResponse>(
      `${this.base(wsId)}/copy/video-script`,
      body,
    );
  }

  generateUgcBrief(wsId: string, body: unknown): Observable<GenerateUgcBriefResponse> {
    return this.http.post<GenerateUgcBriefResponse>(`${this.base(wsId)}/copy/ugc-brief`, body);
  }

  enrichAsset(wsId: string, assetId: string, body: unknown): Observable<EnrichAssetResponse> {
    return this.http.post<EnrichAssetResponse>(
      `${this.base(wsId)}/assets/${assetId}/enrich`,
      body,
    );
  }

  listAiLinks(
    wsId: string,
    params: { producedEntityType?: string; producedEntityId?: string },
  ): Observable<CreativeAiRunLinkResponse[]> {
    let httpParams = new HttpParams();
    if (params.producedEntityType != null) {
      httpParams = httpParams.set('producedEntityType', params.producedEntityType);
    }
    if (params.producedEntityId != null) {
      httpParams = httpParams.set('producedEntityId', params.producedEntityId);
    }
    return this.http.get<CreativeAiRunLinkResponse[]>(`${this.base(wsId)}/links`, {
      params: httpParams,
    });
  }
}
