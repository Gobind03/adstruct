import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IntegrationResourcesApiService } from '../services/integration-resources-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { IntegrationResourceResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-resources-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <a mat-button [routerLink]="['/integrations/accounts', accountId()]">
      <mat-icon>arrow_back</mat-icon>
      Account
    </a>

    <div class="page-header">
      <h2>Resources</h2>
      <button mat-raised-button color="primary" (click)="discover()" [disabled]="!accountId() || loading()">
        <mat-icon>travel_explore</mat-icon>
        Discover
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {
      <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let row">{{ row.resourceType }}</td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let row">{{ row.displayName }}</td>
        </ng-container>
        <ng-container matColumnDef="externalId">
          <th mat-header-cell *matHeaderCellDef>External ID</th>
          <td mat-cell *matCellDef="let row"><code>{{ row.externalResourceId }}</code></td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let row">
            <mat-chip>{{ row.status }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="enabled">
          <th mat-header-cell *matHeaderCellDef>Enabled</th>
          <td mat-cell *matCellDef="let row">
            <mat-slide-toggle
              [checked]="isEnabled(row)"
              (change)="toggle(row, $event.checked)"
            />
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin: 16px 0; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    code { font-size: 12px; }
  `],
})
export class ResourcesListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private resourcesApi = inject(IntegrationResourcesApiService);
  private admin = inject(AdminStore);
  private notify = inject(NotificationService);

  accountId = signal<string | null>(null);
  loading = signal(false);
  rows: IntegrationResourceResponse[] = [];
  displayedColumns = ['type', 'name', 'externalId', 'status', 'enabled'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.accountId.set(id);
    if (!id) return;
    this.load(id);
  }

  load(accountId: string): void {
    const oid = this.admin.selectedOrgId();
    if (!oid) {
      this.notify.error('Select an organization');
      return;
    }
    this.loading.set(true);
    this.resourcesApi.list(oid, accountId).subscribe({
      next: (data) => {
        this.rows = data;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load resources');
      },
    });
  }

  isEnabled(row: IntegrationResourceResponse): boolean {
    try {
      const m = JSON.parse(row.metaJson || '{}') as { enabled?: boolean };
      return m.enabled !== false;
    } catch {
      return true;
    }
  }

  discover(): void {
    const id = this.accountId();
    const oid = this.admin.selectedOrgId();
    if (!id || !oid) return;
    this.resourcesApi.discover(oid, id).subscribe({
      next: (rows) => {
        this.notify.success(`Discovered ${rows.length} items`);
        this.load(id);
      },
      error: () => this.notify.error('Discover failed'),
    });
  }

  toggle(row: IntegrationResourceResponse, enabled: boolean): void {
    const oid = this.admin.selectedOrgId();
    if (!oid) return;
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(row.metaJson || '{}') as Record<string, unknown>;
    } catch {
      meta = {};
    }
    meta['enabled'] = enabled;
    this.resourcesApi.update(oid, row.id, { metaJson: JSON.stringify(meta) }).subscribe({
      next: (updated) => {
        row.metaJson = updated.metaJson;
        this.notify.success(enabled ? 'Resource enabled' : 'Resource disabled');
      },
      error: () => {
        this.notify.error('Update failed');
      },
    });
  }
}
