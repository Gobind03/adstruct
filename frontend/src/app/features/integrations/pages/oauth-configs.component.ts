import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { OauthConfigApiService } from '../services/oauth-config-api.service';
import { NotificationService } from '@core/services/notification.service';
import { OAuthConfigResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-oauth-configs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCardModule,
  ],
  template: `
    <h2>OAuth configurations</h2>
    <p class="muted">Admin OAuth client settings per platform.</p>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {
      <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
        <ng-container matColumnDef="providerKey">
          <th mat-header-cell *matHeaderCellDef>Platform</th>
          <td mat-cell *matCellDef="let row">
            <mat-chip>{{ row.platformType }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="enabled">
          <th mat-header-cell *matHeaderCellDef>Enabled</th>
          <td mat-cell *matCellDef="let row">
            <mat-slide-toggle
              [checked]="row.enabled"
              (change)="toggle(row, $event.checked)"
            />
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let row">
            <button mat-icon-button (click)="edit(row)">
              <mat-icon>{{ editingId() === row.id ? 'expand_less' : 'edit' }}</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (editingId()) {
        <mat-card class="edit-card">
          <mat-card-title>Edit {{ editingRow()?.platformType }}</mat-card-title>
          <mat-card-content class="edit-panel">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Client ID</mat-label>
              <input matInput [(ngModel)]="draft.clientId" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Client secret</mat-label>
              <input matInput type="password" [(ngModel)]="draft.clientSecret" placeholder="Leave blank to keep" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Scopes</mat-label>
              <textarea matInput rows="2" [(ngModel)]="draft.scopes"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Redirect URI</mat-label>
              <input matInput [(ngModel)]="draft.redirectUri" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Auth URL</mat-label>
              <input matInput [(ngModel)]="draft.authUrl" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Token URL</mat-label>
              <input matInput [(ngModel)]="draft.tokenUrl" />
            </mat-form-field>
            <div class="edit-actions">
              <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
              <button mat-raised-button color="primary" type="button" (click)="save()" [disabled]="!editingRow()">Save</button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    h2 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); margin-bottom: 16px; }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .edit-card { margin-top: 20px; }
    .edit-panel { display: flex; flex-direction: column; gap: 8px; }
    .full { width: 100%; }
    .edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class OauthConfigsComponent implements OnInit {
  private oauthApi = inject(OauthConfigApiService);
  private notify = inject(NotificationService);

  loading = signal(false);
  rows: OAuthConfigResponse[] = [];
  displayedColumns = ['providerKey', 'enabled', 'actions'];
  editingId = signal<string | null>(null);

  draft: {
    clientId: string;
    clientSecret: string;
    scopes: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
  } = { clientId: '', clientSecret: '', scopes: '', redirectUri: '', authUrl: '', tokenUrl: '' };

  editingRow(): OAuthConfigResponse | undefined {
    const id = this.editingId();
    return id ? this.rows.find((r) => r.id === id) : undefined;
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.oauthApi.list().subscribe({
      next: (data) => {
        this.rows = data;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load OAuth configs');
      },
    });
  }

  edit(row: OAuthConfigResponse): void {
    if (this.editingId() === row.id) {
      this.cancelEdit();
      return;
    }
    this.editingId.set(row.id);
    this.draft = {
      clientId: row.clientId,
      clientSecret: '',
      scopes: row.scopes,
      redirectUri: row.redirectUri,
      authUrl: row.authUrl,
      tokenUrl: row.tokenUrl,
    };
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  save(): void {
    const row = this.editingRow();
    if (!row) return;
    const body: Record<string, unknown> = {
      clientId: this.draft.clientId,
      scopes: this.draft.scopes,
      redirectUri: this.draft.redirectUri,
      authUrl: this.draft.authUrl,
      tokenUrl: this.draft.tokenUrl,
      enabled: row.enabled,
    };
    if (this.draft.clientSecret.trim()) {
      body['clientSecret'] = this.draft.clientSecret;
    }
    this.oauthApi.update(row.id, body).subscribe({
      next: () => {
        this.notify.success('OAuth config saved');
        this.cancelEdit();
        this.reload();
      },
      error: () => this.notify.error('Save failed'),
    });
  }

  toggle(row: OAuthConfigResponse, enabled: boolean): void {
    row.enabled = enabled;
    this.oauthApi.update(row.id, { enabled }).subscribe({
      next: () => this.notify.success(enabled ? 'Enabled' : 'Disabled'),
      error: () => {
        row.enabled = !enabled;
        this.notify.error('Update failed');
      },
    });
  }
}
