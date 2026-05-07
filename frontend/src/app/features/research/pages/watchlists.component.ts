import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { ResearchSectionHeaderComponent } from '../components/research-section-header.component';
import {
  CompetitorResponse,
  REFRESH_FREQUENCIES,
  WATCHLIST_TYPES,
  WatchlistResponse,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

export interface CreateWatchlistDialogData {
  competitors: CompetitorResponse[];
}

@Component({
  selector: 'app-create-watchlist-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Create watchlist</h2>
    <mat-dialog-content class="dlg">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" name="n" required />
        <mat-hint>A short label shown in lists and notifications.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="watchlistType" name="wt" required>
          @for (t of watchTypes; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
        <mat-hint>What this watchlist tracks (competitor, topic, keyword, etc.).</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Refresh frequency</mat-label>
        <mat-select [(ngModel)]="frequency" name="fq" required>
          @for (f of frequencies; track f) {
            <mat-option [value]="f">{{ f }}</mat-option>
          }
        </mat-select>
        <mat-hint>How often automated refreshes should run (manual = on-demand only).</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Competitor (optional)</mat-label>
        <mat-select [(ngModel)]="competitorId" name="cmp">
          <mat-option [value]="''">— None —</mat-option>
          @for (c of data.competitors; track c.id) {
            <mat-option [value]="c.id">{{ c.name }}</mat-option>
          }
        </mat-select>
        <mat-hint>Link to a tracked competitor when the watchlist is competitor-specific.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!name.trim()" (click)="save()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dlg {
        min-width: 400px;
        padding-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class CreateWatchlistDialogComponent {
  readonly ref = inject(MatDialogRef<CreateWatchlistDialogComponent>);
  readonly data = inject<CreateWatchlistDialogData>(MAT_DIALOG_DATA);
  readonly watchTypes = [...WATCHLIST_TYPES];
  readonly frequencies = [...REFRESH_FREQUENCIES];
  name = '';
  watchlistType = this.watchTypes[0];
  frequency = this.frequencies[0];
  competitorId = '';

  save(): void {
    this.ref.close({
      name: this.name.trim(),
      watchlistType: this.watchlistType,
      frequency: this.frequency,
      competitorId: this.competitorId || undefined,
      queryJson: {},
    });
  }
}

@Component({
  selector: 'app-watchlists',
  standalone: true,
  imports: [
    CommonModule,
    ResearchEmptyStateComponent,
    ResearchSectionHeaderComponent,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-research-section-header
        title="Watchlists"
        description="Monitor competitors, topics, and keywords on a schedule. Refreshes create research jobs you can track under Research Jobs."
      >
        <button mat-flat-button color="primary" type="button" (click)="openCreate()">
          <mat-icon>add</mat-icon>
          Create Watchlist
        </button>
      </app-research-section-header>

      @if (!workspaceId()) {
        <mat-card class="hint-card">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace to manage watchlists.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!watchlists().length) {
        <app-research-empty-state
          icon="visibility"
          title="No watchlists yet"
          description="Create a watchlist to track topics, brands, or competitors and refresh them on a cadence."
          actionLabel="Create Watchlist"
          (action)="openCreate()"
        />
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="watchlists()" class="wl-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [matTooltip]="'Watchlist focus area'" matTooltipShowDelay="200">{{ row.watchlistType }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="frequency">
              <th mat-header-cell *matHeaderCellDef>Frequency</th>
              <td mat-cell *matCellDef="let row">
                <span class="freq-badge" [matTooltip]="'Scheduled refresh cadence'" matTooltipShowDelay="200">{{
                  row.frequency
                }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="enabled">
              <th mat-header-cell *matHeaderCellDef>Enabled</th>
              <td mat-cell *matCellDef="let row">
                <mat-slide-toggle
                  [checked]="row.enabled"
                  disabled
                  [matTooltip]="'Display only — toggle changes require API support.'"
                  matTooltipShowDelay="200"
                />
              </td>
            </ng-container>
            <ng-container matColumnDef="last">
              <th mat-header-cell *matHeaderCellDef>Last refreshed</th>
              <td mat-cell *matCellDef="let row">{{ row.lastRefreshedAt ? (row.lastRefreshedAt | date: 'medium') : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-stroked-button
                  color="primary"
                  type="button"
                  (click)="refresh(row)"
                  [matTooltip]="'Queue a refresh job for this watchlist'"
                >
                  <mat-icon>refresh</mat-icon>
                  Refresh
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page {
        padding: 16px 20px 40px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .hint-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px !important;
      }
      .hint-card mat-icon {
        color: #9e9e9e;
      }
      .centered {
        display: flex;
        justify-content: center;
        padding: 48px;
      }
      .table-card {
        overflow: auto;
      }
      .wl-table {
        width: 100%;
      }
      .freq-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        background: #f5f5f5;
        font-size: 12px;
        font-weight: 600;
        color: #424242;
      }
    `,
  ],
})
export class WatchlistsComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly watchlists = signal<WatchlistResponse[]>([]);
  readonly competitors = signal<CompetitorResponse[]>([]);
  readonly loading = signal(false);
  readonly columns = ['name', 'type', 'frequency', 'enabled', 'last', 'actions'];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.watchlists.set([]);
      this.competitors.set([]);
      return;
    }
    this.loading.set(true);
    this.api.listWatchlists(ws).subscribe({
      next: (list) => {
        this.watchlists.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load watchlists.');
      },
    });
    this.api.listCompetitors(ws).subscribe({
      next: (c) => this.competitors.set(c),
      error: () => {},
    });
  }

  openCreate(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.notify.error('Select a workspace first.');
      return;
    }
    const ref = this.dialog.open(CreateWatchlistDialogComponent, {
      width: '480px',
      data: { competitors: this.competitors() } satisfies CreateWatchlistDialogData,
    });
    ref.afterClosed().subscribe(
      (
        result:
          | {
              name: string;
              watchlistType: string;
              frequency: string;
              competitorId?: string;
              queryJson: Record<string, unknown>;
            }
          | undefined,
      ) => {
        if (!result?.name) return;
        this.api.createWatchlist(ws, result).subscribe({
          next: () => {
            this.notify.success('Watchlist created.');
            this.reload();
          },
          error: () => this.notify.error('Failed to create watchlist.'),
        });
      },
    );
  }

  refresh(row: WatchlistResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    this.api.refreshWatchlist(ws, row.id).subscribe({
      next: () => {
        this.notify.success(`Refresh queued for “${row.name}”.`);
        this.reload();
      },
      error: () => this.notify.error('Refresh failed.'),
    });
  }
}
