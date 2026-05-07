import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { PlatformConstraintsApiService } from '../services/platform-constraints-api.service';
import { PlatformConstraintResponse } from '../models/governance.models';

const PLATFORM_TYPES = [
  'X',
  'META',
  'LINKEDIN',
  'GOOGLE_ADS',
  'TIKTOK',
  'PINTEREST',
  'SNAP',
] as const;

@Component({
  selector: 'app-platform-constraints',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Platform constraints</h2>
        <p class="page-sub">
          Read-only limits and rules enforced per advertising platform.
          @if (orgId()) {
            <span class="ctx"> · Org {{ orgId()!.slice(0, 8) }}…</span>
          }
          @if (workspaceId()) {
            <span class="ctx"> · Workspace {{ workspaceId()!.slice(0, 8) }}…</span>
          }
        </p>
      </div>
    </div>

    <mat-form-field appearance="outline" class="platform">
      <mat-label>Platform</mat-label>
      <mat-select [value]="platformType()" (selectionChange)="onPlatformChange($event.value)">
        @for (p of platformTypes; track p) {
          <mat-option [value]="p">{{ p }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (constraints().length === 0) {
      <p class="empty">No constraints for this platform.</p>
    } @else {
      <div class="cards">
        @for (c of constraints(); track c.id) {
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ c.constraintType }}</mat-card-title>
              <mat-card-subtitle>{{ c.platformType }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <pre class="json-block">{{ formatJson(c.valueJson) }}</pre>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 16px;
      }
      h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .page-sub {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 4px 0 0;
      }
      .ctx {
        opacity: 0.85;
      }
      .platform {
        width: 280px;
        margin-bottom: 20px;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 40px;
      }
      .empty {
        color: var(--text-secondary);
        padding: 16px 0;
      }
      .cards {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .json-block {
        margin: 0;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 4px;
        overflow: auto;
        font-size: 13px;
        line-height: 1.45;
        max-height: 320px;
      }
    `,
  ],
})
export class PlatformConstraintsComponent implements OnInit {
  readonly platformTypes = PLATFORM_TYPES;

  loading = signal(false);
  platformType = signal<string>(PLATFORM_TYPES[0]);
  constraints = signal<PlatformConstraintResponse[]>([]);

  constructor(
    private readonly platformApi: PlatformConstraintsApiService,
    private readonly admin: AdminStore,
    private readonly notify: NotificationService
  ) {}

  orgId = this.admin.selectedOrgId;
  workspaceId = this.admin.selectedWorkspaceId;

  ngOnInit(): void {
    this.reload();
  }

  onPlatformChange(value: string): void {
    this.platformType.set(value);
    this.reload();
  }

  formatJson(raw: string): string {
    try {
      const v = JSON.parse(raw) as unknown;
      return JSON.stringify(v, null, 2);
    } catch {
      return raw;
    }
  }

  private reload(): void {
    this.loading.set(true);
    const pt = this.platformType();
    this.platformApi.list(pt).subscribe({
      next: (rows) => {
        this.constraints.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load platform constraints');
      },
    });
  }
}
