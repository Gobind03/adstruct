import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HealthApiService } from '../services/health-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { IntegrationAccountResponse, HealthSummaryResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-health-diagnostics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Health diagnostics</h2>

    <mat-form-field appearance="outline" class="picker">
      <mat-label>Integration account</mat-label>
      <mat-select [(ngModel)]="selectedId" (selectionChange)="loadHealth()">
        <mat-option [value]="''">—</mat-option>
        @for (a of accounts(); track a.id) {
          <mat-option [value]="a.id">{{ a.displayName }} ({{ a.platformType }})</mat-option>
        }
      </mat-select>
    </mat-form-field>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (health()) {
      <div class="grid">
        <mat-card>
          <mat-card-title>Overall</mat-card-title>
          <mat-card-content>
            <mat-chip [class.bad]="health()!.overallStatus !== 'OK'">{{ health()!.overallStatus }}</mat-chip>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-title>Timestamps</mat-card-title>
          <mat-card-content class="kv">
            <div><span>Last validated</span><strong>{{ health()!.lastValidatedAt | date: 'medium' }}</strong></div>
            <div><span>Last sync</span><strong>{{ health()!.lastSyncAt | date: 'medium' }}</strong></div>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-title>Webhook</mat-card-title>
          <mat-card-content>
            <mat-chip>{{ health()!.webhookStatus }}</mat-chip>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-title>Rate limits</mat-card-title>
          <mat-card-content>
            <p>{{ health()!.rateLimitStrategy || '—' }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="warn-card">
        <mat-card-title>Warnings</mat-card-title>
        <mat-card-content>
          @if (!health()!.warnings.length) {
            <p class="muted">No warnings.</p>
          } @else {
            <mat-list>
              @for (w of health()!.warnings!; track w) {
                <mat-list-item>
                  <mat-icon matListItemIcon color="warn">warning</mat-icon>
                  <span matListItemTitle>{{ w }}</span>
                </mat-list-item>
              }
            </mat-list>
          }
        </mat-card-content>
      </mat-card>
    } @else if (selectedId) {
      <p class="muted">No diagnostics loaded.</p>
    } @else {
      <p class="muted">Choose an account.</p>
    }
  `,
  styles: [`
    h2 { font-size: 22px; font-weight: 600; margin-bottom: 16px; }
    .picker { width: min(100%, 420px); margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .kv div { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 14px; }
    .kv span { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); }
    .warn-card { margin-top: 8px; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); }
    mat-chip.bad { --mdc-chip-container-color: #ffebee; color: #b71c1c; }
    .loading { display: flex; justify-content: center; padding: 40px; }
  `],
})
export class HealthDiagnosticsComponent implements OnInit {
  private healthApi = inject(HealthApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly orgId = this.admin.selectedOrgId;
  accounts = signal<IntegrationAccountResponse[]>([]);
  selectedId = '';
  loading = signal(false);
  health = signal<HealthSummaryResponse | null>(null);

  ngOnInit(): void {
    const oid = this.orgId();
    if (oid) {
      this.accountsApi.list(oid).subscribe({
        next: (a) => this.accounts.set(a),
        error: () => this.notify.error('Failed to load accounts'),
      });
    }
  }

  loadHealth(): void {
    const id = this.selectedId;
    const oid = this.orgId();
    if (!id || !oid) {
      this.health.set(null);
      return;
    }
    this.loading.set(true);
    this.healthApi.get(oid, id).subscribe({
      next: (h) => {
        this.health.set(h);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.health.set(null);
        this.notify.error('Failed to load health');
      },
    });
  }
}
