import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { EventSummaryResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class EventApiService {
  private baseUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  getSummary(workspaceId: string, campaignId?: string, from?: string, to?: string): Observable<EventSummaryResponse[]> {
    let params = new HttpParams().set('workspaceId', workspaceId);
    if (campaignId) params = params.set('campaignId', campaignId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<EventSummaryResponse[]>(`${this.baseUrl}/summary`, { params });
  }
}
