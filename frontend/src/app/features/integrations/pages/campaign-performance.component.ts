import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CampaignReportApiService } from '../services/campaign-report-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { MappingsApiService } from '../services/mappings-api.service';
import { CampaignApiService } from '../../campaigns/services/campaign.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  CampaignReportDataResponse,
  CampaignReportSummaryResponse,
  IntegrationAccountResponse,
  CampaignResponse,
} from '@shared/models/api.models';

@Component({
  selector: 'app-campaign-performance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Campaign Reports</h2>
        <p class="subtitle">View performance data synced from your ad platforms and map external campaigns to internal ones</p>
      </div>
      <a mat-stroked-button routerLink="/integrations/sync-jobs">
        <mat-icon>sync</mat-icon>
        Sync Jobs
      </a>
    </div>

    @if (!orgId()) {
      <mat-card class="hint-card warn-card">
        <mat-card-content class="hint-content">
          <mat-icon>warning</mat-icon>
          <span>Select an organization in the sidebar to view campaign reports.</span>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="kpi-row">
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-value">{{ summary()?.totalSpend | currency:'USD':'symbol':'1.2-2' }}</div>
            <div class="kpi-label">Total Spend</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-value">{{ summary()?.totalImpressions | number }}</div>
            <div class="kpi-label">Impressions</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-value">{{ summary()?.totalClicks | number }}</div>
            <div class="kpi-label">Clicks</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-value">{{ summary()?.totalConversions | number }}</div>
            <div class="kpi-label">Conversions</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="filter-card">
        <mat-card-content class="filter-row">
          <mat-form-field appearance="outline">
            <mat-label>Account</mat-label>
            <mat-select [(ngModel)]="filterAccountId" (selectionChange)="load()">
              <mat-option value="">All Accounts</mat-option>
              @for (a of accounts(); track a.id) {
                <mat-option [value]="a.id">{{ a.displayName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>From</mat-label>
            <input matInput [matDatepicker]="fromPicker" [(ngModel)]="filterFrom"
                   (dateChange)="load()" placeholder="Start date">
            <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
            <mat-datepicker #fromPicker />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>To</mat-label>
            <input matInput [matDatepicker]="toPicker" [(ngModel)]="filterTo"
                   (dateChange)="load()" placeholder="End date">
            <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
            <mat-datepicker #toPicker />
          </mat-form-field>
          <mat-slide-toggle [(ngModel)]="showUnmappedOnly" (change)="load()"
                            matTooltip="Show only campaigns not yet mapped to an internal campaign">
            Unmapped only
          </mat-slide-toggle>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else if (rows().length === 0) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon class="empty-icon">bar_chart</mat-icon>
            <h3>No synced data yet</h3>
            <p class="empty-desc">Follow these steps to see your campaign data here:</p>
            <div class="onboarding-steps">
              <div class="onboarding-step">
                <div class="ob-step-num">1</div>
                <div class="ob-step-body">
                  <strong>Connect a platform</strong>
                  <span>
                    Go to <a routerLink="/integrations/accounts">Accounts</a> and connect
                    an ad platform (Meta, Google Ads, etc.)
                  </span>
                </div>
              </div>
              <div class="onboarding-step">
                <div class="ob-step-num">2</div>
                <div class="ob-step-body">
                  <strong>Run a sync job</strong>
                  <span>
                    Go to <a routerLink="/integrations/sync-jobs">Sync Jobs</a>, create a job
                    for your account, and click Run
                  </span>
                </div>
              </div>
              <div class="onboarding-step">
                <div class="ob-step-num">3</div>
                <div class="ob-step-body">
                  <strong>View & map data</strong>
                  <span>Synced campaign data will appear here. Map external campaigns to your internal ones for status syncing.</span>
                </div>
              </div>
            </div>
            <div class="empty-actions">
              <a mat-raised-button color="primary" routerLink="/integrations/sync-jobs">
                <mat-icon>sync</mat-icon>
                Go to Sync Jobs
              </a>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        @if (hasUnmapped()) {
          <mat-card class="hint-card mapping-hint">
            <mat-card-content class="hint-content">
              <mat-icon>info</mat-icon>
              <span>
                <strong>{{ unmappedCount() }} unmapped campaign{{ unmappedCount() !== 1 ? 's' : '' }}.</strong>
                Use the "Mapped To" column to link external campaigns to your internal ones.
                Once mapped, future syncs will automatically update your campaign status and link report data.
              </span>
            </mat-card-content>
          </mat-card>
        }

        @if (!wsId()) {
          <mat-card class="hint-card warn-card">
            <mat-card-content class="hint-content">
              <mat-icon>warning</mat-icon>
              <span>Select a workspace in the sidebar to enable campaign mapping.</span>
            </mat-card-content>
          </mat-card>
        }

        <table mat-table [dataSource]="rows()" class="mat-elevation-z1 full-width report-table">
          <ng-container matColumnDef="campaignName">
            <th mat-header-cell *matHeaderCellDef>Campaign</th>
            <td mat-cell *matCellDef="let row">
              <div class="campaign-cell">
                <span class="campaign-name">{{ row.campaignName }}</span>
                <span class="campaign-ext-id">{{ row.externalCampaignId }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="platform">
            <th mat-header-cell *matHeaderCellDef>Platform</th>
            <td mat-cell *matCellDef="let row">
              <mat-chip disableRipple>{{ row.platformType }}</mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">{{ row.campaignStatus }}</td>
          </ng-container>

          <ng-container matColumnDef="reportDate">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let row">{{ row.reportDate }}</td>
          </ng-container>

          <ng-container matColumnDef="spend">
            <th mat-header-cell *matHeaderCellDef>Spend</th>
            <td mat-cell *matCellDef="let row" class="num-cell">{{ row.spend | currency:'USD':'symbol':'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="impressions">
            <th mat-header-cell *matHeaderCellDef>Impressions</th>
            <td mat-cell *matCellDef="let row" class="num-cell">{{ row.impressions | number }}</td>
          </ng-container>

          <ng-container matColumnDef="clicks">
            <th mat-header-cell *matHeaderCellDef>Clicks</th>
            <td mat-cell *matCellDef="let row" class="num-cell">{{ row.clicks | number }}</td>
          </ng-container>

          <ng-container matColumnDef="ctr">
            <th mat-header-cell *matHeaderCellDef>CTR</th>
            <td mat-cell *matCellDef="let row" class="num-cell">{{ (row.ctr * 100) | number:'1.2-2' }}%</td>
          </ng-container>

          <ng-container matColumnDef="conversions">
            <th mat-header-cell *matHeaderCellDef>Conv.</th>
            <td mat-cell *matCellDef="let row" class="num-cell">{{ row.conversions | number }}</td>
          </ng-container>

          <ng-container matColumnDef="mappedTo">
            <th mat-header-cell *matHeaderCellDef>
              Mapped To
              <mat-icon class="header-help"
                        matTooltip="Map external campaigns to internal ones. Once mapped, syncs auto-update campaign status and link data.">
                help_outline
              </mat-icon>
            </th>
            <td mat-cell *matCellDef="let row">
              @if (row.internalCampaignName) {
                <div class="mapped-cell">
                  <mat-icon class="mapped-icon">link</mat-icon>
                  <span class="mapped-label">{{ row.internalCampaignName }}</span>
                </div>
              } @else if (!wsId()) {
                <span class="unmapped-hint"
                      matTooltip="Select a workspace to enable mapping">
                  Select workspace
                </span>
              } @else if (campaigns().length === 0) {
                <span class="unmapped-hint"
                      matTooltip="No internal campaigns found in the selected workspace">
                  No campaigns
                </span>
              } @else {
                <div class="map-action">
                  <mat-form-field appearance="outline" class="map-select">
                    <mat-select placeholder="Map to campaign..."
                                (selectionChange)="mapCampaign(row, $event.value)">
                      @for (c of campaigns(); track c.id) {
                        <mat-option [value]="c.id">{{ c.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="table-footer">
          <mat-icon>lightbulb</mat-icon>
          <span>
            Mapping a campaign creates a persistent link. All future syncs will automatically update
            the internal campaign's status and connect report data.
            Mapped campaigns show synced metrics on their
            <strong>campaign detail page</strong> under the "Synced Metrics" tab.
            For advanced mapping management, use
            <a routerLink="/integrations/entity-mappings">Entity Mappings</a>.
          </span>
        </div>
      }
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
    .subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }

    .hint-card { margin-bottom: 16px; border-left: 3px solid #1976d2; }
    .hint-card.warn-card { border-left-color: #e65100; }
    .hint-card.mapping-hint { border-left-color: #1976d2; }
    .hint-content {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .hint-content .mat-icon { color: #1976d2; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
    .warn-card .hint-content .mat-icon { color: #e65100; }
    .hint-content strong { color: var(--text-primary); }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .kpi-card { text-align: center; }
    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .kpi-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

    .filter-card { margin-bottom: 20px; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .filter-row mat-form-field { min-width: 160px; }

    .loading { display: flex; justify-content: center; padding: 40px; }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .empty-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; }

    .onboarding-steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 480px;
      margin: 0 auto 24px;
      text-align: left;
    }
    .onboarding-step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .ob-step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .ob-step-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
      padding-top: 4px;
    }
    .ob-step-body strong { color: var(--text-primary); font-size: 14px; }
    .ob-step-body span { color: var(--text-secondary); }
    .ob-step-body a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .ob-step-body a:hover { text-decoration: underline; }
    .empty-actions { margin-top: 8px; }

    .full-width { width: 100%; }
    .report-table { margin-top: 0; }
    .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
    .campaign-cell { display: flex; flex-direction: column; }
    .campaign-name { font-weight: 500; }
    .campaign-ext-id { font-size: 12px; color: var(--text-muted); }

    .header-help {
      font-size: 16px;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      color: var(--text-muted);
      cursor: help;
      margin-left: 4px;
    }

    .mapped-cell { display: flex; align-items: center; gap: 4px; }
    .mapped-icon { font-size: 16px; width: 16px; height: 16px; color: #4caf50; }
    .mapped-label { font-size: 13px; color: var(--color-primary); font-weight: 500; }
    .unmapped-hint { font-size: 12px; color: var(--text-muted); font-style: italic; cursor: help; }
    .map-action { display: flex; align-items: center; gap: 4px; }
    .map-select { width: 170px; margin: 0; }
    :host ::ng-deep .map-select .mat-mdc-form-field-subscript-wrapper { display: none; }

    .table-footer {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-default);
      line-height: 1.5;
    }
    .table-footer .mat-icon { color: #f9a825; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
  `],
})
export class CampaignPerformanceComponent implements OnInit {
  private reportApi = inject(CampaignReportApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  private campaignApi = inject(CampaignApiService);
  private mappingsApi = inject(MappingsApiService);
  private admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly orgId = this.admin.selectedOrgId;
  readonly wsId = this.admin.selectedWorkspaceId;

  loading = signal(false);
  rows = signal<CampaignReportDataResponse[]>([]);
  summary = signal<CampaignReportSummaryResponse | null>(null);
  accounts = signal<IntegrationAccountResponse[]>([]);
  campaigns = signal<CampaignResponse[]>([]);

  unmappedCount = computed(() => {
    const seen = new Set<string>();
    for (const r of this.rows()) {
      if (!r.internalCampaignId) seen.add(r.externalCampaignId);
    }
    return seen.size;
  });
  hasUnmapped = computed(() => this.unmappedCount() > 0);

  filterAccountId = '';
  filterFrom: Date | null = null;
  filterTo: Date | null = null;
  showUnmappedOnly = false;

  displayedColumns = [
    'campaignName', 'platform', 'status', 'reportDate',
    'spend', 'impressions', 'clicks', 'ctr', 'conversions', 'mappedTo',
  ];

  ngOnInit(): void {
    const oid = this.orgId();
    if (!oid) return;

    this.accountsApi.list(oid).subscribe({
      next: (a) => this.accounts.set(a),
    });

    const ws = this.wsId();
    if (ws) {
      this.campaignApi.list(ws, undefined, 0, 200).subscribe({
        next: (page) => this.campaigns.set(page.content),
      });
    }

    this.load();
  }

  load(): void {
    const oid = this.orgId();
    if (!oid) return;
    this.loading.set(true);

    const params: Record<string, any> = {};
    if (this.filterAccountId) params['accountId'] = this.filterAccountId;
    if (this.filterFrom) params['from'] = this.formatDate(this.filterFrom);
    if (this.filterTo) params['to'] = this.formatDate(this.filterTo);
    if (this.showUnmappedOnly) params['mapped'] = false;

    this.reportApi.list(oid, params).subscribe({
      next: (data) => {
        this.rows.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load campaign reports');
      },
    });

    const summaryParams = { ...params };
    delete summaryParams['mapped'];
    this.reportApi.summary(oid, summaryParams).subscribe({
      next: (s) => this.summary.set(s),
    });
  }

  mapCampaign(row: CampaignReportDataResponse, internalCampaignId: string): void {
    const ws = this.wsId();
    if (!ws) {
      this.notify.error('Select a workspace first');
      return;
    }

    this.mappingsApi.create(ws, {
      integrationAccountId: row.integrationAccountId,
      resourceId: null,
      internalEntityType: 'CAMPAIGN',
      internalEntityId: internalCampaignId,
      externalEntityType: 'CAMPAIGN',
      externalEntityId: row.externalCampaignId,
    }).subscribe({
      next: () => {
        this.notify.success('Campaign mapped successfully. Future syncs will link data automatically.');
        this.load();
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Mapping failed';
        this.notify.error(err?.status === 409 ? 'This mapping already exists' : detail);
      },
    });
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
