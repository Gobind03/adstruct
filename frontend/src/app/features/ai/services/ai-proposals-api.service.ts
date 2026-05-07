import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AiActionProposal } from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiProposalsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(wsId: string): string {
    return `${this.base}/workspaces/${wsId}/ai/action-proposals`;
  }

  list(wsId: string, status?: string): Observable<AiActionProposal[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<AiActionProposal[]>(this.path(wsId), { params });
  }

  get(wsId: string, proposalId: string): Observable<AiActionProposal> {
    return this.http.get<AiActionProposal>(`${this.path(wsId)}/${proposalId}`);
  }

  submit(wsId: string, proposalId: string): Observable<AiActionProposal> {
    return this.http.post<AiActionProposal>(`${this.path(wsId)}/${proposalId}/submit`, {});
  }

  approve(wsId: string, proposalId: string, notes?: string): Observable<AiActionProposal> {
    return this.http.post<AiActionProposal>(
      `${this.path(wsId)}/${proposalId}/approve`,
      notes ?? ''
    );
  }

  reject(wsId: string, proposalId: string, notes?: string): Observable<AiActionProposal> {
    return this.http.post<AiActionProposal>(
      `${this.path(wsId)}/${proposalId}/reject`,
      notes ?? ''
    );
  }

  execute(wsId: string, proposalId: string): Observable<AiActionProposal> {
    return this.http.post<AiActionProposal>(`${this.path(wsId)}/${proposalId}/execute`, {});
  }
}
