import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MappingsApiService } from '../services/mappings-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { PlatformEntityMappingResponse, IntegrationAccountResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-entity-mappings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Entity Mappings</h2>
        <p class="subtitle">Link external ad platform campaigns to your internal campaigns</p>
      </div>
      <div class="header-actions">
        <a mat-stroked-button routerLink="/integrations/campaign-reports">
          <mat-icon>bar_chart</mat-icon> Campaign Reports
        </a>
        <a mat-stroked-button routerLink="/integrations/sync-jobs">
          <mat-icon>sync</mat-icon> Sync Jobs
        </a>
      </div>
    </div>

    <!-- What are entity mappings -->
    <mat-card class="guide-card">
      <mat-card-content>
        <div class="guide-header">
          <mat-icon>info</mat-icon>
          <strong>What are Entity Mappings?</strong>
        </div>
        <p class="guide-desc">
          Entity mappings connect campaigns from external ad platforms (Meta Ads, Google Ads, etc.)
          to your internal campaigns. Once mapped:
        </p>
        <ul class="guide-benefits">
          <li><mat-icon class="benefit-icon">sync</mat-icon> <strong>Sync jobs</strong> and <strong>webhooks</strong> automatically route performance data to the correct internal campaign</li>
          <li><mat-icon class="benefit-icon">update</mat-icon> Campaign <strong>status changes</strong> (active, paused, archived) are synced from the external platform</li>
          <li><mat-icon class="benefit-icon">bar_chart</mat-icon> Synced metrics appear on the <strong>campaign detail page</strong> under the "Synced Metrics" tab</li>
        </ul>
        <div class="guide-tip">
          <mat-icon>lightbulb</mat-icon>
          <span>
            <strong>Easiest way to map:</strong> Go to
            <a routerLink="/integrations/campaign-reports">Campaign Reports</a>,
            find the external campaign, and use the "Mapped To" dropdown.
            This page is for advanced search and manual management.
          </span>
        </div>
      </mat-card-content>
    </mat-card>

    @if (!workspaceId()) {
      <mat-card class="hint-card warn-card">
        <mat-card-content class="hint-content">
          <mat-icon>warning</mat-icon>
          <span>Select a workspace in the sidebar to manage entity mappings.</span>
        </mat-card-content>
      </mat-card>
    } @else {

      <!-- Search sections -->
      <h3 class="section-title">Search Existing Mappings</h3>
      <div class="search-grid">
        <mat-card class="search-card">
          <mat-card-content>
            <div class="card-label">
              <mat-icon>search</mat-icon> By Internal Campaign
            </div>
            <p class="card-hint">Look up all external campaigns linked to an internal campaign.</p>
            <div class="search-row">
              <mat-form-field appearance="outline">
                <mat-label>Internal type</mat-label>
                <mat-select [(ngModel)]="internalType">
                  <mat-option value="CAMPAIGN">CAMPAIGN</mat-option>
                </mat-select>
                <mat-hint>Usually "CAMPAIGN"</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Internal campaign ID</mat-label>
                <input matInput [(ngModel)]="internalId" placeholder="e.g. a0eebc99-..." />
                <mat-hint>UUID from your campaign detail page</mat-hint>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="searchInternal()" [disabled]="!canInternal()">
                <mat-icon>search</mat-icon> Search
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="search-card">
          <mat-card-content>
            <div class="card-label">
              <mat-icon>search</mat-icon> By External Campaign
            </div>
            <p class="card-hint">Look up which internal campaign an external platform campaign is linked to.</p>
            <div class="search-row">
              <mat-form-field appearance="outline">
                <mat-label>Ad platform account</mat-label>
                <mat-select [(ngModel)]="externalAccountId">
                  <mat-option [value]="''">-- Select --</mat-option>
                  @for (a of accounts(); track a.id) {
                    <mat-option [value]="a.id">{{ a.displayName }} ({{ a.platformType }})</mat-option>
                  }
                </mat-select>
                <mat-hint>Which ad account contains this campaign?</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>External type</mat-label>
                <mat-select [(ngModel)]="externalType">
                  <mat-option value="CAMPAIGN">CAMPAIGN</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>External campaign ID</mat-label>
                <input matInput [(ngModel)]="externalId" placeholder="e.g. 23851234567890" />
                <mat-hint>The campaign ID from the ad platform</mat-hint>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="searchExternal()" [disabled]="!canExternal()">
                <mat-icon>search</mat-icon> Search
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Create mapping -->
      <h3 class="section-title">Create New Mapping</h3>
      <mat-card class="create-card">
        <mat-card-content>
          <p class="card-hint">
            Manually link an external platform campaign to an internal campaign.
            This immediately backfills all existing report data for this external campaign.
          </p>
          <div class="create-row">
            <mat-form-field appearance="outline">
              <mat-label>Ad platform account</mat-label>
              <mat-select [(ngModel)]="newAccountId">
                <mat-option [value]="''">-- Select --</mat-option>
                @for (a of accounts(); track a.id) {
                  <mat-option [value]="a.id">{{ a.displayName }} ({{ a.platformType }})</mat-option>
                }
              </mat-select>
              <mat-hint>Which ad account?</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>External campaign ID</mat-label>
              <input matInput [(ngModel)]="newExternalEntityId"
                     placeholder="e.g. 23851234567890"
                     matTooltip="The campaign ID from Meta/Google/LinkedIn. Find this in Campaign Reports under the 'Campaign' column." />
              <mat-hint>From the ad platform</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Internal campaign ID</mat-label>
              <input matInput [(ngModel)]="newInternalId"
                     placeholder="e.g. a0eebc99-9c0b-..."
                     matTooltip="The UUID of your internal campaign. Find this on the campaign detail page or in the campaigns list." />
              <mat-hint>UUID of your campaign</mat-hint>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="create()" [disabled]="!canCreate()">
              <mat-icon>link</mat-icon> Create Mapping
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Results -->
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else if (rows.length > 0) {
        <h3 class="section-title">Results</h3>
        <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
          <ng-container matColumnDef="account">
            <th mat-header-cell *matHeaderCellDef>Account</th>
            <td mat-cell *matCellDef="let row">{{ accountName(row.integrationAccountId) }}</td>
          </ng-container>
          <ng-container matColumnDef="internal">
            <th mat-header-cell *matHeaderCellDef>
              Internal
              <mat-icon class="header-help" matTooltip="Your internal campaign type and UUID">help_outline</mat-icon>
            </th>
            <td mat-cell *matCellDef="let row">
              <span class="entity-type">{{ row.internalEntityType }}</span>
              <code class="entity-id">{{ row.internalEntityId }}</code>
            </td>
          </ng-container>
          <ng-container matColumnDef="external">
            <th mat-header-cell *matHeaderCellDef>
              External
              <mat-icon class="header-help" matTooltip="The ad platform campaign type and ID">help_outline</mat-icon>
            </th>
            <td mat-cell *matCellDef="let row">
              <span class="entity-type">{{ row.externalEntityType }}</span>
              <code class="entity-id">{{ row.externalEntityId }}</code>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <mat-chip [class]="'mapping-' + row.mappingStatus.toLowerCase()">{{ row.mappingStatus }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="warn" (click)="remove(row)"
                      matTooltip="Delete this mapping. Future syncs will no longer link to this internal campaign.">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      } @else if (searched) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon class="empty-icon">link_off</mat-icon>
            <h3>No mappings found</h3>
            <p>
              No entity mappings match your search.
              Try creating a mapping using the form above, or map campaigns directly from
              <a routerLink="/integrations/campaign-reports">Campaign Reports</a>.
            </p>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }
    .header-actions { display: flex; gap: 8px; }

    .guide-card { margin-bottom: 20px; background: var(--color-primary-muted); }
    .guide-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; }
    .guide-header .mat-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; }
    .guide-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 10px; line-height: 1.5; }
    .guide-benefits {
      list-style: none; padding: 0; margin: 0 0 12px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .guide-benefits li {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text-secondary); line-height: 1.4;
    }
    .benefit-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
    .guide-tip {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; background: rgba(0,0,0,0.03); border-radius: 6px;
      font-size: 12px; color: var(--text-secondary); line-height: 1.5;
    }
    .guide-tip .mat-icon { color: #f9a825; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .guide-tip a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .guide-tip a:hover { text-decoration: underline; }

    .hint-card { margin-bottom: 16px; border-left: 3px solid #e65100; }
    .hint-card.warn-card .hint-content .mat-icon { color: #e65100; }
    .hint-content {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: var(--text-secondary);
    }
    .hint-content .mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }

    .section-title { font-size: 15px; font-weight: 600; margin: 20px 0 12px; color: rgba(0,0,0,0.7); }

    .search-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .search-card { flex: 1; min-width: 320px; margin-bottom: 8px; }
    .card-label { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .card-label .mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .card-hint { font-size: 12px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.4; }

    .search-row, .create-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    mat-form-field { min-width: 180px; flex: 1; }
    .create-card { margin-bottom: 16px; }

    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }

    .entity-type {
      font-size: 11px; text-transform: uppercase; font-weight: 600;
      color: var(--text-muted); margin-right: 6px;
    }
    .entity-id {
      font-size: 11px; background: rgba(0,0,0,0.04);
      padding: 2px 6px; border-radius: 4px; word-break: break-all;
    }
    .header-help {
      font-size: 16px; width: 16px; height: 16px;
      vertical-align: middle; color: var(--text-muted); cursor: help; margin-left: 4px;
    }
    mat-chip.mapping-active { --mdc-chip-container-color: #e8f5e9; color: #1b5e20; }
    mat-chip.mapping-inactive { --mdc-chip-container-color: #fff3e0; color: #e65100; }

    .empty-state { text-align: center; padding: 32px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 8px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .empty-state p { color: var(--text-secondary); font-size: 14px; }
    .empty-state a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-state a:hover { text-decoration: underline; }
  `],
})
export class EntityMappingsComponent implements OnInit {
  private mappingsApi = inject(MappingsApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly orgId = this.admin.selectedOrgId;
  loading = signal(false);
  rows: PlatformEntityMappingResponse[] = [];
  searched = false;
  displayedColumns = ['account', 'internal', 'external', 'status', 'actions'];

  accounts = signal<IntegrationAccountResponse[]>([]);

  internalType = 'CAMPAIGN';
  internalId = '';
  externalAccountId = '';
  externalType = 'CAMPAIGN';
  externalId = '';

  newAccountId = '';
  newInternalId = '';
  newExternalEntityId = '';

  ngOnInit(): void {
    const oid = this.orgId();
    if (oid) {
      this.accountsApi.list(oid).subscribe({
        next: (a) => this.accounts.set(a),
        error: () => this.notify.error('Failed to load accounts'),
      });
    }
  }

  accountName(accountId: string): string {
    const acc = this.accounts().find((a) => a.id === accountId);
    return acc ? `${acc.displayName} (${acc.platformType})` : accountId;
  }

  canInternal(): boolean {
    return !!(this.workspaceId() && this.internalType.trim() && this.internalId.trim());
  }

  searchInternal(): void {
    const ws = this.workspaceId();
    if (!ws || !this.canInternal()) return;
    this.loading.set(true);
    this.searched = true;
    this.mappingsApi.getByInternal(ws, this.internalType.trim(), this.internalId.trim()).subscribe({
      next: (data) => { this.rows = data; this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Search failed'); },
    });
  }

  canExternal(): boolean {
    return !!(this.workspaceId() && this.externalAccountId && this.externalType.trim() && this.externalId.trim());
  }

  searchExternal(): void {
    const ws = this.workspaceId();
    if (!ws || !this.canExternal()) return;
    this.loading.set(true);
    this.searched = true;
    this.mappingsApi
      .getByExternal(ws, this.externalAccountId, this.externalType.trim(), this.externalId.trim())
      .subscribe({
        next: (data) => { this.rows = data; this.loading.set(false); },
        error: () => { this.loading.set(false); this.notify.error('Search failed'); },
      });
  }

  canCreate(): boolean {
    return !!(this.workspaceId() && this.newAccountId && this.newInternalId.trim() && this.newExternalEntityId.trim());
  }

  create(): void {
    const ws = this.workspaceId();
    if (!ws || !this.canCreate()) return;
    this.mappingsApi
      .create(ws, {
        accountId: this.newAccountId,
        resourceId: null,
        internalEntityType: 'CAMPAIGN',
        internalEntityId: this.newInternalId.trim(),
        externalEntityType: 'CAMPAIGN',
        externalEntityId: this.newExternalEntityId.trim(),
      })
      .subscribe({
        next: () => {
          this.notify.success('Mapping created. Existing report data has been backfilled.');
          this.newInternalId = '';
          this.newExternalEntityId = '';
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Create failed';
          this.notify.error(err?.status === 409 ? 'This mapping already exists' : detail);
        },
      });
  }

  remove(row: PlatformEntityMappingResponse): void {
    if (!window.confirm('Delete this mapping? Future syncs will no longer link data to this internal campaign.')) return;
    const ws = this.workspaceId();
    if (!ws) return;
    this.mappingsApi.remove(ws, row.id).subscribe({
      next: () => {
        this.notify.success('Mapping deleted');
        this.rows = this.rows.filter((r) => r.id !== row.id);
      },
      error: () => this.notify.error('Delete failed'),
    });
  }
}
