import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PlatformConstraintResponse } from '../models/governance.models';

@Injectable({ providedIn: 'root' })
export class PlatformConstraintsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  list(platformType?: string): Observable<PlatformConstraintResponse[]> {
    let params = new HttpParams();
    if (platformType) params = params.set('platformType', platformType);
    return this.http.get<PlatformConstraintResponse[]>(`${this.base}/platform-constraints`, { params });
  }
}
