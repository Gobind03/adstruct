import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { IntegrationProviderResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class IntegrationProvidersApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(category?: string): Observable<IntegrationProviderResponse[]> {
    const options =
      category !== undefined && category !== ''
        ? { params: new HttpParams().set('category', category) }
        : {};
    return this.http.get<IntegrationProviderResponse[]>(`${this.base}/integration-providers`, options);
  }

  getByPlatform(platformType: string): Observable<IntegrationProviderResponse> {
    return this.http.get<IntegrationProviderResponse>(
      `${this.base}/integration-providers/${encodeURIComponent(platformType)}`
    );
  }
}
