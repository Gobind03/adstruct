import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  CampaignResponse, CampaignCreateRequest, PagedResponse,
  TargetSetResponse, TargetSetRequest,
  SponsoredUnitResponse, SponsoredUnitRequest,
  CampaignReportDataResponse,
} from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class CampaignApiService {
  private baseUrl = `${environment.apiUrl}/campaigns`;

  constructor(private http: HttpClient) {}

  list(workspaceId: string, status?: string, page = 0, size = 20): Observable<PagedResponse<CampaignResponse>> {
    let params = new HttpParams()
      .set('workspaceId', workspaceId)
      .set('page', page)
      .set('size', size);
    if (status) params = params.set('status', status);
    return this.http.get<PagedResponse<CampaignResponse>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<CampaignResponse> {
    return this.http.get<CampaignResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: CampaignCreateRequest): Observable<CampaignResponse> {
    return this.http.post<CampaignResponse>(this.baseUrl, request);
  }

  update(id: string, request: Partial<CampaignCreateRequest>): Observable<CampaignResponse> {
    return this.http.put<CampaignResponse>(`${this.baseUrl}/${id}`, request);
  }

  activate(id: string): Observable<CampaignResponse> {
    return this.http.post<CampaignResponse>(`${this.baseUrl}/${id}/activate`, {});
  }

  pause(id: string): Observable<CampaignResponse> {
    return this.http.post<CampaignResponse>(`${this.baseUrl}/${id}/pause`, {});
  }

  archive(id: string): Observable<CampaignResponse> {
    return this.http.post<CampaignResponse>(`${this.baseUrl}/${id}/archive`, {});
  }

  listTargetSets(campaignId: string): Observable<TargetSetResponse[]> {
    return this.http.get<TargetSetResponse[]>(`${this.baseUrl}/${campaignId}/target-sets`);
  }

  createTargetSet(campaignId: string, request: TargetSetRequest): Observable<TargetSetResponse> {
    return this.http.post<TargetSetResponse>(`${this.baseUrl}/${campaignId}/target-sets`, request);
  }

  listSponsoredUnits(campaignId: string): Observable<SponsoredUnitResponse[]> {
    return this.http.get<SponsoredUnitResponse[]>(`${this.baseUrl}/${campaignId}/sponsored-units`);
  }

  createSponsoredUnit(campaignId: string, request: SponsoredUnitRequest): Observable<SponsoredUnitResponse> {
    return this.http.post<SponsoredUnitResponse>(`${this.baseUrl}/${campaignId}/sponsored-units`, request);
  }

  updateSponsoredUnit(campaignId: string, unitId: string, request: SponsoredUnitRequest): Observable<SponsoredUnitResponse> {
    return this.http.put<SponsoredUnitResponse>(`${this.baseUrl}/${campaignId}/sponsored-units/${unitId}`, request);
  }

  deleteSponsoredUnit(campaignId: string, unitId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${campaignId}/sponsored-units/${unitId}`);
  }

  getSyncedReports(campaignId: string): Observable<CampaignReportDataResponse[]> {
    return this.http.get<CampaignReportDataResponse[]>(`${this.baseUrl}/${campaignId}/synced-reports`);
  }
}
