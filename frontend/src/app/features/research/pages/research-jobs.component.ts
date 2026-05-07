import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ResearchSectionHeaderComponent } from '../components/research-section-header.component';
import { StatusChipComponent } from '../components/status-chip.component';
import { JobResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

@Component({
  selector: 'app-research-jobs',
  standalone: true,
  imports: [
    CommonModule,
    ResearchSectionHeaderComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    StatusChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-research-section-header
        title="Research Jobs"
        description="Track long-running research operations: ingestions, AI runs, and watchlist refreshes. Status updates as jobs move through the queue."
      >
        <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading() || !workspaceId()">
          <mat-icon>refresh</mat-icon>
          Reload
        </button>
      </app-research-section-header>

      @if (!workspaceId()) {
        <mat-card class="hint-card">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace to view research jobs.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!jobs().length) {
        <mat-card class="empty-card">
          <mat-icon>task_alt</mat-icon>
          <p>No jobs recorded yet. Jobs appear when you ingest sources, refresh watchlists, or run AI workflows.</p>
        </mat-card>
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="jobs()" class="jobs-table">
            <ng-container matColumnDef="jobType">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let row">{{ row.jobType }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-chip [status]="row.status" type="job" />
              </td>
            </ng-container>
            <ng-container matColumnDef="requestedBy">
              <th mat-header-cell *matHeaderCellDef>Requested by</th>
              <td mat-cell *matCellDef="let row">
                <span [matTooltip]="'User who queued this job'" matTooltipShowDelay="200">{{
                  row.requestedByUserId
                }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="startedAt">
              <th mat-header-cell *matHeaderCellDef>Started</th>
              <td mat-cell *matCellDef="let row">{{ row.startedAt ? (row.startedAt | date: 'medium') : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="finishedAt">
              <th mat-header-cell *matHeaderCellDef>Finished</th>
              <td mat-cell *matCellDef="let row">{{ row.finishedAt ? (row.finishedAt | date: 'medium') : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef>Duration</th>
              <td mat-cell *matCellDef="let row">{{ durationLabel(row) }}</td>
            </ng-container>
            <ng-container matColumnDef="errorMessage">
              <th mat-header-cell *matHeaderCellDef>Error</th>
              <td mat-cell *matCellDef="let row">
                @if (row.errorMessage) {
                  <button
                    mat-button
                    type="button"
                    class="err-toggle"
                    (click)="toggleExpand(row.id)"
                    [matTooltip]="'Show or hide full error text'"
                  >
                    <mat-icon>{{ expandedId() === row.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                    {{ expandedId() === row.id ? 'Hide' : 'View' }}
                  </button>
                  @if (expandedId() === row.id) {
                    <pre class="err-pre">{{ row.errorMessage }}</pre>
                  }
                } @else {
                  <span class="muted">—</span>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" class="data-row"></tr>
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
        max-width: 1200px;
        margin: 0 auto;
      }
      .hint-card,
      .empty-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px !important;
      }
      .empty-card {
        flex-direction: column;
        text-align: center;
      }
      .empty-card mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #bdbdbd;
      }
      .centered {
        display: flex;
        justify-content: center;
        padding: 48px;
      }
      .table-card {
        overflow: auto;
      }
      .jobs-table {
        width: 100%;
      }
      .err-toggle {
        min-width: auto;
        padding: 0 8px;
      }
      .err-pre {
        margin: 8px 0 0;
        padding: 10px 12px;
        background: #fff8e1;
        border-left: 4px solid #ff9800;
        white-space: pre-wrap;
        font-size: 12px;
        color: #5d4037;
        max-width: 480px;
      }
      .muted {
        color: #9e9e9e;
      }
      .data-row {
        cursor: default;
        vertical-align: top;
      }
    `,
  ],
})
export class ResearchJobsComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly jobs = signal<JobResponse[]>([]);
  readonly loading = signal(false);
  readonly expandedId = signal<string | null>(null);
  readonly columns = ['jobType', 'status', 'requestedBy', 'startedAt', 'finishedAt', 'duration', 'errorMessage'];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.jobs.set([]);
      return;
    }
    this.loading.set(true);
    this.api.listJobs(ws).subscribe({
      next: (list) => {
        this.jobs.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load research jobs.');
      },
    });
  }

  durationLabel(row: JobResponse): string {
    if (!row.startedAt || !row.finishedAt) {
      return '—';
    }
    const a = new Date(row.startedAt).getTime();
    const b = new Date(row.finishedAt).getTime();
    const sec = Math.max(0, Math.round((b - a) / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }
}
