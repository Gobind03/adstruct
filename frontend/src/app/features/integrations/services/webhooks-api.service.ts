import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { WebhookResponse, WebhookDeliveryResponse } from '@shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class WebhooksApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private webhookBase(orgId: string, accountId: string): string {
    return `${this.base}/orgs/${orgId}/integrations/accounts/${accountId}/webhook`;
  }

  get(orgId: string, accountId: string): Observable<WebhookResponse> {
    return this.http.get<WebhookResponse>(this.webhookBase(orgId, accountId));
  }

  register(orgId: string, accountId: string, body?: unknown): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.webhookBase(orgId, accountId)}/register`, body ?? {});
  }

  rotateSecret(orgId: string, accountId: string): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.webhookBase(orgId, accountId)}/rotate-secret`, {});
  }

  toggleStatus(orgId: string, accountId: string): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.webhookBase(orgId, accountId)}/toggle-status`, {});
  }

  listDeliveries(orgId: string): Observable<WebhookDeliveryResponse[]> {
    return this.http.get<WebhookDeliveryResponse[]>(
      `${this.base}/orgs/${orgId}/integrations/webhooks/deliveries`
    );
  }
}
