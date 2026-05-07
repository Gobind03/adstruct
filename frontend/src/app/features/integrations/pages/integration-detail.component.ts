import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { HealthApiService } from '../services/health-api.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IntegrationAccountResponse, HealthSummaryResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-integration-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    @if (integration) {
      <div class="page-header">
        <h2>{{ integration.displayName }}</h2>
        <a mat-button routerLink="/integrations">
          <mat-icon>arrow_back</mat-icon> Back
        </a>
      </div>

      <div class="detail-grid">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-row">
              <span class="label">Platform</span>
              <span>{{ integration.platformType }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status</span>
              <mat-chip [class]="'status-' + integration.status.toLowerCase()">
                {{ integration.status }}
              </mat-chip>
            </div>
            <div class="detail-row">
              <span class="label">Auth Type</span>
              <span>{{ integration.authType }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created</span>
              <span>{{ integration.createdAt | date:'medium' }}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" (click)="checkHealth()">
              <mat-icon>health_and_safety</mat-icon> Check Health
            </button>
            @if (integration.status === 'CONNECTED') {
              <button mat-button color="warn" (click)="disconnect()">
                <mat-icon>link_off</mat-icon> Disconnect
              </button>
            }
          </mat-card-actions>
        </mat-card>

        @if (health) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>Health Check</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="detail-row">
                <span class="label">Overall</span>
                <mat-chip>{{ health.overallStatus }}</mat-chip>
              </div>
              <div class="detail-row">
                <span class="label">Connection</span>
                <span>{{ health.connectionStatus }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Webhook</span>
                <span>{{ health.webhookStatus }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Last validated</span>
                <span>{{ health.lastValidatedAt | date:'medium' }}</span>
              </div>
              @if (health.warnings.length) {
                <div class="detail-row">
                  <span class="label">Warnings</span>
                  <span>{{ health.warnings.join('; ') }}</span>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      </div>
    } @else {
      <mat-spinner></mat-spinner>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-default);
    }
    .label { font-weight: 500; color: var(--text-secondary); font-size: 14px; }
  `],
})
export class IntegrationDetailComponent implements OnInit {
  integration: IntegrationAccountResponse | null = null;
  health: HealthSummaryResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private integrationAccountsApi: IntegrationAccountsApiService,
    private healthApi: HealthApiService,
    private workspaceService: WorkspaceService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    const org = this.workspaceService.currentOrg();
    const id = this.route.snapshot.paramMap.get('id')!;
    if (!org) return;
    this.integrationAccountsApi.getById(org.id, id).subscribe((data) => (this.integration = data));
  }

  checkHealth(): void {
    const org = this.workspaceService.currentOrg();
    if (!this.integration || !org) return;
    this.healthApi.get(org.id, this.integration.id).subscribe((h) => (this.health = h));
  }

  disconnect(): void {
    const org = this.workspaceService.currentOrg();
    if (!this.integration || !org) return;
    this.integrationAccountsApi.disconnect(org.id, this.integration.id).subscribe((data) => {
      this.integration = data;
      this.notify.success('Disconnected');
    });
  }
}
