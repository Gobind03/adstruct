import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  OrgBrandProfileResponse,
  OrgBrandProfilePatchRequest,
  EffectiveBrandProfileResponse,
} from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class BrandProfileApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getOrgProfile(orgId: string): Observable<OrgBrandProfileResponse> {
    return this.http.get<OrgBrandProfileResponse>(`${this.base}/orgs/${orgId}/brand-profile`);
  }

  createOrgProfile(orgId: string): Observable<OrgBrandProfileResponse> {
    return this.http.post<OrgBrandProfileResponse>(`${this.base}/orgs/${orgId}/brand-profile`, {});
  }

  patchOrgProfile(orgId: string, req: OrgBrandProfilePatchRequest): Observable<OrgBrandProfileResponse> {
    return this.http.patch<OrgBrandProfileResponse>(`${this.base}/orgs/${orgId}/brand-profile`, req);
  }

  getEffectiveProfile(workspaceId: string): Observable<EffectiveBrandProfileResponse> {
    return this.http.get<EffectiveBrandProfileResponse>(
      `${this.base}/workspaces/${workspaceId}/brand-profile/effective`
    );
  }

  patchOverrides(workspaceId: string, overridesJson: string): Observable<EffectiveBrandProfileResponse> {
    return this.http.patch<EffectiveBrandProfileResponse>(
      `${this.base}/workspaces/${workspaceId}/brand-profile/overrides`,
      { overridesJson }
    );
  }

  initWorkspaceProfile(workspaceId: string): Observable<EffectiveBrandProfileResponse> {
    return this.http.post<EffectiveBrandProfileResponse>(
      `${this.base}/workspaces/${workspaceId}/brand-profile/init`,
      {}
    );
  }
}
