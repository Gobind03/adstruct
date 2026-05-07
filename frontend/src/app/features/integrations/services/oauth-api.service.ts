import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OauthApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  authorize(platformType: string, orgId: string, displayName?: string): Observable<{ authUrl: string }> {
    let params = new HttpParams().set('orgId', orgId);
    if (displayName) {
      params = params.set('displayName', displayName);
    }
    return this.http.get<{ authUrl: string }>(
      `${this.base}/oauth/${encodeURIComponent(platformType)}/authorize`,
      { params }
    );
  }
}
