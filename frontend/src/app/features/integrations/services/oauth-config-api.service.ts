import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { OAuthConfigResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class OauthConfigApiService {
  private base = `${environment.apiUrl}/admin/oauth-configs`;

  constructor(private http: HttpClient) {}

  list(): Observable<OAuthConfigResponse[]> {
    return this.http.get<OAuthConfigResponse[]>(this.base);
  }

  update(id: string, body: unknown): Observable<OAuthConfigResponse> {
    return this.http.patch<OAuthConfigResponse>(`${this.base}/${id}`, body);
  }
}
