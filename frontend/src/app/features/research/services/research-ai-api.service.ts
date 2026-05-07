import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  ClusterRequest,
  ClusterResponse,
  DigestRunRequest,
  DigestRunResponse,
  ExtractRequest,
  ExtractResponse,
  PersonaDraftRequest,
  PersonaDraftResponse,
  ResearchAiRunLinkResponse,
  SummarizeRequest,
  SummarizeResponse,
} from '@features/research/models/research.models';

@Injectable({ providedIn: 'root' })
export class ResearchAiApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/research/ai`;
  }

  summarizeSnapshot(wsId: string, snapshotId: string, req: SummarizeRequest): Observable<SummarizeResponse> {
    return this.http.post<SummarizeResponse>(`${this.base(wsId)}/snapshots/${snapshotId}/summarize`, req);
  }

  extractCompetitorInsights(wsId: string, competitorId: string, req: ExtractRequest): Observable<ExtractResponse> {
    return this.http.post<ExtractResponse>(`${this.base(wsId)}/competitors/${competitorId}/extract`, req);
  }

  clusterKeywords(wsId: string, req: ClusterRequest): Observable<ClusterResponse> {
    return this.http.post<ClusterResponse>(`${this.base(wsId)}/keywords/cluster`, req);
  }

  draftPersona(wsId: string, req: PersonaDraftRequest): Observable<PersonaDraftResponse> {
    return this.http.post<PersonaDraftResponse>(`${this.base(wsId)}/personas/draft`, req);
  }

  runDigest(wsId: string, req: DigestRunRequest): Observable<DigestRunResponse> {
    return this.http.post<DigestRunResponse>(`${this.base(wsId)}/digest/run`, req);
  }

  listAiLinks(
    wsId: string,
    params?: { producedEntityType?: string; producedEntityId?: string },
  ): Observable<ResearchAiRunLinkResponse[]> {
    let httpParams = new HttpParams();
    if (params?.producedEntityType != null && params.producedEntityType !== '') {
      httpParams = httpParams.set('producedEntityType', params.producedEntityType);
    }
    if (params?.producedEntityId != null && params.producedEntityId !== '') {
      httpParams = httpParams.set('producedEntityId', params.producedEntityId);
    }
    return this.http.get<ResearchAiRunLinkResponse[]>(`${this.base(wsId)}/links`, { params: httpParams });
  }
}
