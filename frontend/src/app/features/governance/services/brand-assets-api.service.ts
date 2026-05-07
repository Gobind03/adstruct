import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { BrandAssetResponse, BrandAssetCreateRequest, BrandAssetPatchRequest } from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class BrandAssetsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(orgId: string, workspaceId?: string, status?: string): Observable<BrandAssetResponse[]> {
    let params = new HttpParams();
    if (workspaceId) params = params.set('workspaceId', workspaceId);
    if (status) params = params.set('status', status);
    return this.http.get<BrandAssetResponse[]>(`${this.base}/orgs/${orgId}/brand-assets`, { params });
  }

  create(orgId: string, req: BrandAssetCreateRequest): Observable<BrandAssetResponse> {
    return this.http.post<BrandAssetResponse>(`${this.base}/orgs/${orgId}/brand-assets`, req);
  }

  patch(orgId: string, assetId: string, req: BrandAssetPatchRequest): Observable<BrandAssetResponse> {
    return this.http.patch<BrandAssetResponse>(`${this.base}/orgs/${orgId}/brand-assets/${assetId}`, req);
  }
}
