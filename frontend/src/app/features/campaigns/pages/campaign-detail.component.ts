import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CampaignApiService } from '../services/campaign.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  CampaignResponse,
  TargetSetResponse,
  SponsoredUnitResponse,
  CampaignReportDataResponse,
} from '@shared/models/api.models';

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatTabsModule, MatListModule,
    MatTableModule, MatTooltipModule,
  ],
  template: `
    @if (campaign) {
      <div class="page-header">
        <h2>{{ campaign.name }}</h2>
        <div class="header-actions">
          @if (campaign.status === 'DRAFT' || campaign.status === 'PAUSED') {
            <button mat-raised-button color="primary" (click)="activate()">
              <mat-icon>play_arrow</mat-icon> Activate
            </button>
          }
          @if (campaign.status === 'ACTIVE') {
            <button mat-raised-button color="warn" (click)="pause()">
              <mat-icon>pause</mat-icon> Pause
            </button>
          }
          @if (campaign.status !== 'ARCHIVED') {
            <button mat-button (click)="archive()">
              <mat-icon>archive</mat-icon> Archive
            </button>
          }
          <a mat-button routerLink="/campaigns"><mat-icon>arrow_back</mat-icon> Back</a>
        </div>
      </div>

      <mat-tab-group>
        <mat-tab label="Overview">
          <div class="tab-content">
            <mat-card>
              <mat-card-content>
                <div class="detail-row"><span class="label">Objective</span><span>{{ campaign.objective }}</span></div>
                <div class="detail-row"><span class="label">Status</span>
                  <mat-chip [class]="'status-' + campaign.status.toLowerCase()">{{ campaign.status }}</mat-chip>
                </div>
                <div class="detail-row"><span class="label">Daily Budget</span><span>{{ campaign.dailyBudget | currency }}</span></div>
                <div class="detail-row"><span class="label">Lifetime Budget</span><span>{{ campaign.lifetimeBudget | currency }}</span></div>
                <div class="detail-row"><span class="label">Dates</span><span>{{ campaign.startDate }} — {{ campaign.endDate }}</span></div>
                <div class="detail-row"><span class="label">Pacing</span><span>{{ campaign.pacingMode }}</span></div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <mat-tab label="Targeting">
          <div class="tab-content">
            @for (ts of targetSets; track ts.id) {
              <mat-card class="mb-12">
                <mat-card-header><mat-card-title>{{ ts.intentType }}</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="detail-row"><span class="label">Topics</span><span>{{ ts.topicsJson }}</span></div>
                  <div class="detail-row"><span class="label">Geo</span><span>{{ ts.geoJson }}</span></div>
                </mat-card-content>
              </mat-card>
            }
            @if (targetSets.length === 0) {
              <p>No target sets configured.</p>
            }
          </div>
        </mat-tab>

        <mat-tab label="Sponsored Units">
          <div class="tab-content">
            @for (unit of sponsoredUnits; track unit.id) {
              <mat-card class="mb-12">
                <mat-card-header>
                  <mat-card-title>{{ unit.title }}</mat-card-title>
                  <mat-card-subtitle>{{ unit.type }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>{{ unit.snippet }}</p>
                  <div class="detail-row"><span class="label">CTA</span><span>{{ unit.ctaText }}</span></div>
                  <div class="detail-row"><span class="label">URL</span><span>{{ unit.landingUrl }}</span></div>
                  <div class="detail-row"><span class="label">Status</span>
                    <mat-chip>{{ unit.status }}</mat-chip>
                  </div>
                </mat-card-content>
              </mat-card>
            }
            @if (sponsoredUnits.length === 0) {
              <p>No sponsored units.</p>
            }
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">sync</mat-icon>
            Synced Metrics
            @if (syncedReports.length > 0) {
              <span class="tab-badge">{{ syncedReports.length }}</span>
            }
          </ng-template>
          <div class="tab-content">
            @if (syncedReports.length > 0) {
              <div class="summary-cards">
                <mat-card class="summary-card">
                  <div class="summary-value">{{ totalSpend | currency }}</div>
                  <div class="summary-label">Total Spend</div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-value">{{ totalImpressions | number }}</div>
                  <div class="summary-label">Impressions</div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-value">{{ totalClicks | number }}</div>
                  <div class="summary-label">Clicks</div>
                </mat-card>
                <mat-card class="summary-card">
                  <div class="summary-value">{{ totalConversions | number }}</div>
                  <div class="summary-label">Conversions</div>
                </mat-card>
              </div>

              <mat-card class="synced-info">
                <mat-card-content class="synced-info-content">
                  <mat-icon>info</mat-icon>
                  <span>
                    This data is synced from <strong>{{ syncedReports[0].platformType }}</strong>
                    (external campaign: <code>{{ syncedReports[0].externalCampaignId }}</code>).
                    Data updates automatically when sync jobs run or webhook events arrive.
                  </span>
                </mat-card-content>
              </mat-card>

              <table mat-table [dataSource]="syncedReports" class="mat-elevation-z1 full-width">
                <ng-container matColumnDef="reportDate">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let r">{{ r.reportDate }}</td>
                </ng-container>
                <ng-container matColumnDef="platform">
                  <th mat-header-cell *matHeaderCellDef>Platform</th>
                  <td mat-cell *matCellDef="let r">
                    <mat-chip disableRipple>{{ r.platformType }}</mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="spend">
                  <th mat-header-cell *matHeaderCellDef>Spend</th>
                  <td mat-cell *matCellDef="let r" class="num-cell">{{ r.spend | currency }}</td>
                </ng-container>
                <ng-container matColumnDef="impressions">
                  <th mat-header-cell *matHeaderCellDef>Impressions</th>
                  <td mat-cell *matCellDef="let r" class="num-cell">{{ r.impressions | number }}</td>
                </ng-container>
                <ng-container matColumnDef="clicks">
                  <th mat-header-cell *matHeaderCellDef>Clicks</th>
                  <td mat-cell *matCellDef="let r" class="num-cell">{{ r.clicks | number }}</td>
                </ng-container>
                <ng-container matColumnDef="ctr">
                  <th mat-header-cell *matHeaderCellDef>CTR</th>
                  <td mat-cell *matCellDef="let r" class="num-cell">{{ r.ctr | percent:'1.2-2' }}</td>
                </ng-container>
                <ng-container matColumnDef="conversions">
                  <th mat-header-cell *matHeaderCellDef>Conv.</th>
                  <td mat-cell *matCellDef="let r" class="num-cell">{{ r.conversions | number }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="reportColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: reportColumns"></tr>
              </table>
            } @else {
              <mat-card class="empty-synced">
                <mat-card-content>
                  <mat-icon class="empty-icon">cloud_off</mat-icon>
                  <h3>No synced data yet</h3>
                  <p>
                    To see external platform metrics here, map this campaign to an external ad platform campaign.
                  </p>
                  <div class="empty-steps">
                    <div class="empty-step">
                      <div class="step-num">1</div>
                      <span>Go to <a routerLink="/integrations/campaign-reports">Campaign Reports</a></span>
                    </div>
                    <div class="empty-step">
                      <div class="step-num">2</div>
                      <span>Find the external campaign and use the "Mapped To" dropdown to select this campaign</span>
                    </div>
                    <div class="empty-step">
                      <div class="step-num">3</div>
                      <span>Future sync jobs and webhook events will automatically populate data here</span>
                    </div>
                  </div>
                  <div class="empty-hint">
                    <mat-icon>lightbulb</mat-icon>
                    <span>
                      Campaign ID for reference: <code>{{ campaign!.id }}</code>
                    </span>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
    .header-actions { display: flex; gap: 8px; }
    .tab-content { padding: 20px 0; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-default);
    }
    .label { font-weight: 500; color: var(--text-secondary); font-size: 14px; }
    .mb-12 { margin-bottom: 12px; }
    .tab-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 6px; vertical-align: middle; }
    .tab-badge {
      background: var(--color-primary);
      color: white;
      font-size: 11px;
      border-radius: 10px;
      padding: 1px 7px;
      margin-left: 6px;
      font-weight: 600;
    }

    .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-card {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 16px 12px;
    }
    .summary-value { font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .summary-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

    .synced-info { margin-bottom: 16px; border-left: 3px solid #1976d2; }
    .synced-info-content {
      display: flex; align-items: flex-start; gap: 10px;
      font-size: 13px; color: var(--text-secondary); line-height: 1.5;
    }
    .synced-info-content .mat-icon {
      color: #1976d2; font-size: 20px; width: 20px; height: 20px;
      flex-shrink: 0; margin-top: 1px;
    }
    .synced-info-content code {
      font-size: 12px; background: rgba(0,0,0,0.06);
      padding: 1px 5px; border-radius: 3px;
    }

    .full-width { width: 100%; }
    .num-cell { text-align: right; font-variant-numeric: tabular-nums; }

    .empty-synced { text-align: center; padding: 32px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 8px; }
    .empty-synced h3 { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .empty-synced p { color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; }
    .empty-synced a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-synced a:hover { text-decoration: underline; }
    .empty-steps { display: flex; flex-direction: column; gap: 10px; text-align: left; max-width: 480px; margin: 0 auto 20px; }
    .empty-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
    .step-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: var(--color-primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .empty-hint {
      display: flex; align-items: center; gap: 6px; justify-content: center;
      font-size: 12px; color: var(--text-muted); margin-top: 12px;
    }
    .empty-hint .mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f9a825; }
    .empty-hint code {
      font-size: 11px; background: rgba(0,0,0,0.06);
      padding: 1px 5px; border-radius: 3px; user-select: all;
    }
  `],
})
export class CampaignDetailComponent implements OnInit {
  campaign: CampaignResponse | null = null;
  targetSets: TargetSetResponse[] = [];
  sponsoredUnits: SponsoredUnitResponse[] = [];
  syncedReports: CampaignReportDataResponse[] = [];
  reportColumns = ['reportDate', 'platform', 'spend', 'impressions', 'clicks', 'ctr', 'conversions'];

  get totalSpend(): number {
    return this.syncedReports.reduce((s, r) => s + (r.spend ?? 0), 0);
  }
  get totalImpressions(): number {
    return this.syncedReports.reduce((s, r) => s + (r.impressions ?? 0), 0);
  }
  get totalClicks(): number {
    return this.syncedReports.reduce((s, r) => s + (r.clicks ?? 0), 0);
  }
  get totalConversions(): number {
    return this.syncedReports.reduce((s, r) => s + (r.conversions ?? 0), 0);
  }

  constructor(
    private route: ActivatedRoute,
    private campaignService: CampaignApiService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignService.getById(id).subscribe((c) => (this.campaign = c));
    this.campaignService.listTargetSets(id).subscribe((ts) => (this.targetSets = ts));
    this.campaignService.listSponsoredUnits(id).subscribe((u) => (this.sponsoredUnits = u));
    this.campaignService.getSyncedReports(id).subscribe({
      next: (reports) => (this.syncedReports = reports),
      error: () => {},
    });
  }

  activate(): void {
    if (!this.campaign) return;
    this.campaignService.activate(this.campaign.id).subscribe((c) => {
      this.campaign = c;
      this.notify.success('Campaign activated');
    });
  }

  pause(): void {
    if (!this.campaign) return;
    this.campaignService.pause(this.campaign.id).subscribe((c) => {
      this.campaign = c;
      this.notify.success('Campaign paused');
    });
  }

  archive(): void {
    if (!this.campaign) return;
    this.campaignService.archive(this.campaign.id).subscribe((c) => {
      this.campaign = c;
      this.notify.success('Campaign archived');
    });
  }
}
