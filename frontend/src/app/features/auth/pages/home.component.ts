import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { IntegrationAccountsApiService } from '../../integrations/services/integration-accounts-api.service';
import { IntegrationAccountResponse } from '@shared/models/api.models';
import { environment } from '../../../../environments/environment';

interface HealthResponse {
  status: string;
  components?: Record<string, { status: string; details?: Record<string, unknown> }>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <h1>Welcome, {{ authService.currentUser()?.fullName || 'User' }}</h1>
    <p class="subtitle">AI-driven Digital Advertising Platform</p>

    <div class="cards-grid">
      <!-- Health tile -->
      <mat-card class="tile"
                [class.health-up]="healthStatus() === 'UP'"
                [class.health-down]="healthStatus() === 'DOWN'">
        <div class="tile-header">
          <div class="tile-icon"><mat-icon>monitor_heart</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">System Health</div>
            <div class="tile-sub">Backend status</div>
          </div>
          @if (healthStatus() !== 'LOADING') {
            <mat-icon [class]="'health-badge ' + healthStatus().toLowerCase()">
              {{ healthStatus() === 'UP' ? 'check_circle' : 'error' }}
            </mat-icon>
          }
        </div>
        <div class="tile-body">
          @if (healthStatus() === 'LOADING') {
            <div class="health-indicator">
              <mat-spinner diameter="20"></mat-spinner>
              <span>Checking...</span>
            </div>
          } @else if (healthComponents().length) {
            <div class="health-components">
              @for (comp of healthComponents(); track comp.name) {
                <div class="comp-row">
                  <mat-icon class="comp-icon" [class]="comp.status.toLowerCase()">
                    {{ comp.status === 'UP' ? 'check' : 'warning' }}
                  </mat-icon>
                  <span class="comp-name">{{ comp.name }}</span>
                </div>
              }
            </div>
          }
        </div>
        <div class="tile-footer">
          <button mat-button color="primary" (click)="checkHealth()">Refresh</button>
        </div>
      </mat-card>

      <mat-card class="tile">
        <div class="tile-header">
          <div class="tile-icon"><mat-icon>hub</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">Integrations</div>
            <div class="tile-sub">Platform connections</div>
          </div>
        </div>
        <div class="tile-body">
          @if (accountsLoading()) {
            <div class="health-indicator">
              <mat-spinner diameter="20"></mat-spinner>
              <span>Loading...</span>
            </div>
          } @else if (accounts().length === 0) {
            <p class="empty-hint">No integrations connected yet.</p>
          } @else {
            <div class="stat-row">
              <span class="stat-value">{{ accounts().length }}</span>
              <span class="stat-label">account{{ accounts().length !== 1 ? 's' : '' }} connected</span>
            </div>
            <div class="chip-row">
              @for (s of accountStatusSummary(); track s.status) {
                <mat-chip [class]="'status-chip ' + s.status.toLowerCase()" disableRipple>
                  {{ s.count }} {{ s.status | lowercase }}
                </mat-chip>
              }
            </div>
          }
        </div>
        <div class="tile-footer">
          <a mat-button color="primary" routerLink="/integrations/accounts">View All</a>
        </div>
      </mat-card>

      <mat-card class="tile tile-nav" routerLink="/campaigns">
        <div class="tile-header">
          <div class="tile-icon"><mat-icon>campaign</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">Campaigns</div>
            <div class="tile-sub">Conversational ad campaigns</div>
          </div>
          <mat-icon class="tile-arrow">chevron_right</mat-icon>
        </div>
      </mat-card>

      <mat-card class="tile tile-nav" routerLink="/integrations/campaign-reports">
        <div class="tile-header">
          <div class="tile-icon report-icon"><mat-icon>bar_chart</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">Campaign Reports</div>
            <div class="tile-sub">Synced performance data from ad platforms</div>
          </div>
          <mat-icon class="tile-arrow">chevron_right</mat-icon>
        </div>
      </mat-card>

      <mat-card class="tile tile-nav" routerLink="/approvals">
        <div class="tile-header">
          <div class="tile-icon"><mat-icon>approval</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">Approvals</div>
            <div class="tile-sub">Review pending items</div>
          </div>
          <mat-icon class="tile-arrow">chevron_right</mat-icon>
        </div>
      </mat-card>

      <mat-card class="tile tile-nav" routerLink="/events">
        <div class="tile-header">
          <div class="tile-icon"><mat-icon>analytics</mat-icon></div>
          <div class="tile-text">
            <div class="tile-name">Analytics</div>
            <div class="tile-sub">Event tracking & insights</div>
          </div>
          <mat-icon class="tile-arrow">chevron_right</mat-icon>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 {
      margin-bottom: 4px;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 24px;
      font-size: 15px;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }

    /* --- Tile base --- */
    .tile {
      padding: 16px !important;
      transition: border-color var(--transition-fast), transform var(--transition-fast);
    }
    .tile:hover {
      border-color: var(--border-strong);
    }
    .tile-nav {
      cursor: pointer;
    }
    .tile-nav:hover {
      transform: translateY(-1px);
    }

    .tile-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tile-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .tile-icon .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }
    .tile-text { flex: 1; min-width: 0; }
    .tile-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }
    .tile-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 1px;
    }
    .tile-arrow {
      color: var(--text-disabled);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .health-badge {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .health-badge.up { color: #16a34a; }
    .health-badge.down { color: #dc2626; }

    .tile-body {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-default);
    }
    .tile-footer {
      margin-top: 8px;
    }

    /* --- Health --- */
    .health-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .health-components {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .comp-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .comp-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .comp-icon.up { color: #16a34a; }
    .comp-icon.down, .comp-icon.warn { color: #d97706; }
    .comp-name { text-transform: capitalize; }

    /* --- Integrations stats --- */
    .stat-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      color: var(--color-primary);
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
    }
    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .status-chip.active { --mdc-chip-label-text-color: #16a34a; }
    .status-chip.error, .status-chip.disconnected { --mdc-chip-label-text-color: #dc2626; }
    .status-chip.pending { --mdc-chip-label-text-color: #d97706; }
    .empty-hint {
      color: var(--text-muted);
      font-size: 13px;
      margin: 0;
    }

    /* Hide default mat-card slots we replaced */
    :host ::ng-deep .tile .mat-mdc-card-header,
    :host ::ng-deep .tile .mat-mdc-card-content,
    :host ::ng-deep .tile .mat-mdc-card-actions { display: none; }
  `],
})
export class HomeComponent implements OnInit {
  healthStatus = signal<string>('LOADING');
  healthComponents = signal<{ name: string; status: string }[]>([]);
  accounts = signal<IntegrationAccountResponse[]>([]);
  accountsLoading = signal(false);

  private workspaceService = inject(WorkspaceService);
  private accountsApi = inject(IntegrationAccountsApiService);

  constructor(
    public authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.checkHealth();
    this.loadAccounts();
  }

  accountStatusSummary(): { status: string; count: number }[] {
    const map = new Map<string, number>();
    for (const a of this.accounts()) {
      map.set(a.status, (map.get(a.status) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }

  private loadAccounts(): void {
    const org = this.workspaceService.currentOrg();
    if (!org) return;
    this.accountsLoading.set(true);
    this.accountsApi.list(org.id).subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.accountsLoading.set(false);
      },
      error: () => this.accountsLoading.set(false),
    });
  }

  checkHealth(): void {
    this.healthStatus.set('LOADING');
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    this.http.get<HealthResponse>(`${baseUrl}/actuator/health`).subscribe({
      next: (res) => {
        this.healthStatus.set(res.status);
        if (res.components) {
          this.healthComponents.set(
            Object.entries(res.components).map(([name, info]) => ({
              name,
              status: info.status,
            })),
          );
        }
      },
      error: () => {
        this.healthStatus.set('DOWN');
        this.healthComponents.set([]);
      },
    });
  }
}
