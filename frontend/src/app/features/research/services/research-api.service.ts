import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  CompetitorCreateRequest,
  CompetitorPatchRequest,
  CompetitorResponse,
  DigestReportResponse,
  EvidenceCreateRequest,
  EvidenceResponse,
  HandleCreateRequest,
  HandleResponse,
  IngestFileRequest,
  IngestResponse,
  IngestUrlRequest,
  InsightCreateRequest,
  InsightPatchRequest,
  InsightResponse,
  JobResponse,
  KeywordClusterCreateRequest,
  KeywordClusterResponse,
  PersonaCreateRequest,
  PersonaResponse,
  ResearchLinkCreateRequest,
  ResearchLinkResponse,
  SnapshotCreateRequest,
  SnapshotResponse,
  SourceCreateRequest,
  SourceResponse,
  WatchlistCreateRequest,
  WatchlistResponse,
} from '@features/research/models/research.models';

@Injectable({ providedIn: 'root' })
export class ResearchApiService {
  constructor(private http: HttpClient) {}

  private base(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/research`;
  }

  // Competitors
  listCompetitors(wsId: string, status?: string): Observable<CompetitorResponse[]> {
    let params = new HttpParams();
    if (status != null && status !== '') {
      params = params.set('status', status);
    }
    return this.http.get<CompetitorResponse[]>(`${this.base(wsId)}/competitors`, { params });
  }

  getCompetitor(wsId: string, id: string): Observable<CompetitorResponse> {
    return this.http.get<CompetitorResponse>(`${this.base(wsId)}/competitors/${id}`);
  }

  createCompetitor(wsId: string, req: CompetitorCreateRequest): Observable<CompetitorResponse> {
    return this.http.post<CompetitorResponse>(`${this.base(wsId)}/competitors`, req);
  }

  updateCompetitor(wsId: string, id: string, req: CompetitorPatchRequest): Observable<CompetitorResponse> {
    return this.http.patch<CompetitorResponse>(`${this.base(wsId)}/competitors/${id}`, req);
  }

  deleteCompetitor(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/competitors/${id}`);
  }

  listHandles(wsId: string, competitorId: string): Observable<HandleResponse[]> {
    return this.http.get<HandleResponse[]>(`${this.base(wsId)}/competitors/${competitorId}/handles`);
  }

  addHandle(wsId: string, competitorId: string, req: HandleCreateRequest): Observable<HandleResponse> {
    return this.http.post<HandleResponse>(`${this.base(wsId)}/competitors/${competitorId}/handles`, req);
  }

  removeHandle(wsId: string, competitorId: string, handleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/competitors/${competitorId}/handles/${handleId}`);
  }

  // Sources
  listSources(wsId: string, sourceType?: string): Observable<SourceResponse[]> {
    let params = new HttpParams();
    if (sourceType != null && sourceType !== '') {
      params = params.set('sourceType', sourceType);
    }
    return this.http.get<SourceResponse[]>(`${this.base(wsId)}/sources`, { params });
  }

  getSource(wsId: string, id: string): Observable<SourceResponse> {
    return this.http.get<SourceResponse>(`${this.base(wsId)}/sources/${id}`);
  }

  createSource(wsId: string, req: SourceCreateRequest): Observable<SourceResponse> {
    return this.http.post<SourceResponse>(`${this.base(wsId)}/sources`, req);
  }

  deleteSource(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/sources/${id}`);
  }

  // Snapshots
  listSnapshots(wsId: string): Observable<SnapshotResponse[]> {
    return this.http.get<SnapshotResponse[]>(`${this.base(wsId)}/snapshots`);
  }

  getSnapshot(wsId: string, id: string): Observable<SnapshotResponse> {
    return this.http.get<SnapshotResponse>(`${this.base(wsId)}/snapshots/${id}`);
  }

  createSnapshot(wsId: string, req: SnapshotCreateRequest): Observable<SnapshotResponse> {
    return this.http.post<SnapshotResponse>(`${this.base(wsId)}/snapshots`, req);
  }

  // Ingestion
  ingestUrl(wsId: string, req: IngestUrlRequest): Observable<IngestResponse> {
    return this.http.post<IngestResponse>(`${this.base(wsId)}/ingest/url`, req);
  }

  ingestFile(wsId: string, req: IngestFileRequest): Observable<IngestResponse> {
    return this.http.post<IngestResponse>(`${this.base(wsId)}/ingest/file`, req);
  }

  // Insights
  listInsights(
    wsId: string,
    params?: { status?: string; category?: string; competitorId?: string },
  ): Observable<InsightResponse[]> {
    let httpParams = new HttpParams();
    if (params?.status != null && params.status !== '') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.category != null && params.category !== '') {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.competitorId != null && params.competitorId !== '') {
      httpParams = httpParams.set('competitorId', params.competitorId);
    }
    return this.http.get<InsightResponse[]>(`${this.base(wsId)}/insights`, { params: httpParams });
  }

  getInsight(wsId: string, id: string): Observable<InsightResponse> {
    return this.http.get<InsightResponse>(`${this.base(wsId)}/insights/${id}`);
  }

  createInsight(wsId: string, req: InsightCreateRequest): Observable<InsightResponse> {
    return this.http.post<InsightResponse>(`${this.base(wsId)}/insights`, req);
  }

  updateInsight(wsId: string, id: string, req: InsightPatchRequest): Observable<InsightResponse> {
    return this.http.patch<InsightResponse>(`${this.base(wsId)}/insights/${id}`, req);
  }

  deleteInsight(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/insights/${id}`);
  }

  publishInsight(wsId: string, id: string): Observable<InsightResponse> {
    return this.http.post<InsightResponse>(`${this.base(wsId)}/insights/${id}/publish`, {});
  }

  archiveInsight(wsId: string, id: string): Observable<InsightResponse> {
    return this.http.post<InsightResponse>(`${this.base(wsId)}/insights/${id}/archive`, {});
  }

  listEvidence(wsId: string, insightId: string): Observable<EvidenceResponse[]> {
    return this.http.get<EvidenceResponse[]>(`${this.base(wsId)}/insights/${insightId}/evidence`);
  }

  addEvidence(wsId: string, insightId: string, req: EvidenceCreateRequest): Observable<EvidenceResponse> {
    return this.http.post<EvidenceResponse>(`${this.base(wsId)}/insights/${insightId}/evidence`, req);
  }

  removeEvidence(wsId: string, insightId: string, evidenceId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/insights/${insightId}/evidence/${evidenceId}`);
  }

  // Keyword Clusters
  listClusters(wsId: string): Observable<KeywordClusterResponse[]> {
    return this.http.get<KeywordClusterResponse[]>(`${this.base(wsId)}/keyword-clusters`);
  }

  createCluster(wsId: string, req: KeywordClusterCreateRequest): Observable<KeywordClusterResponse> {
    return this.http.post<KeywordClusterResponse>(`${this.base(wsId)}/keyword-clusters`, req);
  }

  deleteCluster(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/keyword-clusters/${id}`);
  }

  // Personas
  listPersonas(wsId: string): Observable<PersonaResponse[]> {
    return this.http.get<PersonaResponse[]>(`${this.base(wsId)}/personas`);
  }

  createPersona(wsId: string, req: PersonaCreateRequest): Observable<PersonaResponse> {
    return this.http.post<PersonaResponse>(`${this.base(wsId)}/personas`, req);
  }

  deletePersona(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/personas/${id}`);
  }

  // Watchlists
  listWatchlists(wsId: string): Observable<WatchlistResponse[]> {
    return this.http.get<WatchlistResponse[]>(`${this.base(wsId)}/watchlists`);
  }

  createWatchlist(wsId: string, req: WatchlistCreateRequest): Observable<WatchlistResponse> {
    return this.http.post<WatchlistResponse>(`${this.base(wsId)}/watchlists`, req);
  }

  deleteWatchlist(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/watchlists/${id}`);
  }

  refreshWatchlist(wsId: string, id: string): Observable<JobResponse> {
    return this.http.post<JobResponse>(`${this.base(wsId)}/watchlists/${id}/refresh`, {});
  }

  // Jobs
  listJobs(wsId: string): Observable<JobResponse[]> {
    return this.http.get<JobResponse[]>(`${this.base(wsId)}/jobs`);
  }

  getJob(wsId: string, id: string): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.base(wsId)}/jobs/${id}`);
  }

  // Links
  listLinks(
    wsId: string,
    params?: { researchEntityType?: string; researchEntityId?: string },
  ): Observable<ResearchLinkResponse[]> {
    let httpParams = new HttpParams();
    if (params?.researchEntityType != null && params.researchEntityType !== '') {
      httpParams = httpParams.set('researchEntityType', params.researchEntityType);
    }
    if (params?.researchEntityId != null && params.researchEntityId !== '') {
      httpParams = httpParams.set('researchEntityId', params.researchEntityId);
    }
    return this.http.get<ResearchLinkResponse[]>(`${this.base(wsId)}/links`, { params: httpParams });
  }

  createLink(wsId: string, req: ResearchLinkCreateRequest): Observable<ResearchLinkResponse> {
    return this.http.post<ResearchLinkResponse>(`${this.base(wsId)}/links`, req);
  }

  deleteLink(wsId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/links/${id}`);
  }

  // Digests
  listDigests(wsId: string): Observable<DigestReportResponse[]> {
    return this.http.get<DigestReportResponse[]>(`${this.base(wsId)}/digests`);
  }

  getDigest(wsId: string, id: string): Observable<DigestReportResponse> {
    return this.http.get<DigestReportResponse>(`${this.base(wsId)}/digests/${id}`);
  }
}
