import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  DisclaimerResponse,
  DisclaimerCreateRequest,
  DisclaimerLocalizationResponse,
  DisclaimerLocalizationRequest,
} from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class DisclaimersApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(orgId: string, workspaceId?: string, status?: string): Observable<DisclaimerResponse[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    if (status) params = params.set('status', status);
    return this.http.get<DisclaimerResponse[]>(`${this.base}/orgs/${orgId}/disclaimers`, { params });
  }

  create(orgId: string, req: DisclaimerCreateRequest): Observable<DisclaimerResponse> {
    return this.http.post<DisclaimerResponse>(`${this.base}/orgs/${orgId}/disclaimers`, req);
  }

  patch(orgId: string, disclaimerId: string, req: Partial<DisclaimerResponse>): Observable<DisclaimerResponse> {
    return this.http.patch<DisclaimerResponse>(`${this.base}/orgs/${orgId}/disclaimers/${disclaimerId}`, req);
  }

  listLocalizations(orgId: string, disclaimerId: string): Observable<DisclaimerLocalizationResponse[]> {
    return this.http.get<DisclaimerLocalizationResponse[]>(
      `${this.base}/orgs/${orgId}/disclaimers/${disclaimerId}/localizations`
    );
  }

  createLocalization(
    orgId: string,
    disclaimerId: string,
    req: DisclaimerLocalizationRequest
  ): Observable<DisclaimerLocalizationResponse> {
    return this.http.post<DisclaimerLocalizationResponse>(
      `${this.base}/orgs/${orgId}/disclaimers/${disclaimerId}/localizations`,
      req
    );
  }

  patchLocalization(
    orgId: string,
    disclaimerId: string,
    locId: string,
    req: DisclaimerLocalizationRequest
  ): Observable<DisclaimerLocalizationResponse> {
    return this.http.patch<DisclaimerLocalizationResponse>(
      `${this.base}/orgs/${orgId}/disclaimers/${disclaimerId}/localizations/${locId}`,
      req
    );
  }
}
