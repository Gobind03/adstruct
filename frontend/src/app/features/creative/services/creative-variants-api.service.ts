import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { VariantResponse, VariantSetResponse } from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeVariantsApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative`;
  }

  createVariantSet(wsId: string, body: unknown): Observable<VariantSetResponse> {
    return this.http.post<VariantSetResponse>(`${this.base(wsId)}/variant-sets`, body);
  }

  listVariantSets(
    wsId: string,
    params?: { parentEntityType?: string; parentEntityId?: string },
  ): Observable<VariantSetResponse[]> {
    let httpParams = new HttpParams();
    if (params?.parentEntityType != null) {
      httpParams = httpParams.set('parentEntityType', params.parentEntityType);
    }
    if (params?.parentEntityId != null) {
      httpParams = httpParams.set('parentEntityId', params.parentEntityId);
    }
    return this.http.get<VariantSetResponse[]>(`${this.base(wsId)}/variant-sets`, {
      params: httpParams,
    });
  }

  getVariantSet(wsId: string, setId: string): Observable<VariantSetResponse> {
    return this.http.get<VariantSetResponse>(`${this.base(wsId)}/variant-sets/${setId}`);
  }

  addVariant(wsId: string, setId: string, body: unknown): Observable<VariantResponse> {
    return this.http.post<VariantResponse>(
      `${this.base(wsId)}/variant-sets/${setId}/variants`,
      body,
    );
  }

  listVariants(wsId: string, setId: string): Observable<VariantResponse[]> {
    return this.http.get<VariantResponse[]>(
      `${this.base(wsId)}/variant-sets/${setId}/variants`,
    );
  }
}
