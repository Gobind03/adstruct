import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import {
  CampaignReportDataResponse,
  CampaignReportSummaryResponse,
} from '@shared/models/api.models';

export interface CampaignReportListParams {
  accountId?: string;
  from?: string;
  to?: string;
  mapped?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CampaignReportApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private reportsPath(orgId: string): string {
    return `${this.base}/orgs/${orgId}/integrations/campaign-reports`;
  }

  list(orgId: string, params?: CampaignReportListParams): Observable<CampaignReportDataResponse[]> {
    let httpParams = new HttpParams();
    if (params?.accountId) httpParams = httpParams.set('accountId', params.accountId);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    if (params?.mapped !== undefined) httpParams = httpParams.set('mapped', String(params.mapped));
    return this.http.get<CampaignReportDataResponse[]>(this.reportsPath(orgId), { params: httpParams });
  }

  summary(orgId: string, params?: Omit<CampaignReportListParams, 'mapped'>): Observable<CampaignReportSummaryResponse> {
    let httpParams = new HttpParams();
    if (params?.accountId) httpParams = httpParams.set('accountId', params.accountId);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);
    return this.http.get<CampaignReportSummaryResponse>(`${this.reportsPath(orgId)}/summary`, { params: httpParams });
  }
}
