import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { ResearchSectionHeaderComponent } from '../components/research-section-header.component';
import { DigestReportResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

@Component({
  selector: 'app-run-digest-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Run weekly digest</h2>
    <mat-dialog-content class="dlg">
      <p class="warn-copy">
        This uses AI to synthesize activity for the selected period. Confirming will start a workflow run and may incur
        usage according to your workspace policy.
      </p>
      <mat-form-field appearance="outline" class="half">
        <mat-label>Period start</mat-label>
        <input matInput type="date" [(ngModel)]="periodStart" name="ps" required />
        <mat-hint>First day to include (inclusive).</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="half">
        <mat-label>Period end</mat-label>
        <input matInput type="date" [(ngModel)]="periodEnd" name="pe" required />
        <mat-hint>Last day to include (inclusive).</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="accent" type="button" [disabled]="!periodStart || !periodEnd" (click)="next()">
        Continue
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dlg {
        min-width: 400px;
        padding-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .warn-copy {
        width: 100%;
        font-size: 13px;
        color: #5d4037;
        background: #fff8e1;
        padding: 10px 12px;
        border-radius: 4px;
        border-left: 4px solid #ff9800;
        margin: 0 0 8px;
      }
      .half {
        flex: 1;
        min-width: 160px;
      }
    `,
  ],
})
export class RunDigestDialogComponent {
  readonly ref = inject(MatDialogRef<RunDigestDialogComponent>);
  periodStart = '';
  periodEnd = '';

  next(): void {
    this.ref.close({
      periodStart: this.isoDay(this.periodStart),
      periodEnd: this.isoDay(this.periodEnd),
    });
  }

  private isoDay(htmlDate: string): string {
    if (!htmlDate) return '';
    return new Date(htmlDate + 'T12:00:00').toISOString();
  }
}

@Component({
  selector: 'app-digests-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ConfirmDialogComponent,
    ResearchEmptyStateComponent,
    ResearchSectionHeaderComponent,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-research-section-header
        title="Weekly Digests"
        description="AI-generated summaries of research activity for a time window. Use digests to brief stakeholders without re-reading every snapshot."
      >
        <button mat-flat-button color="accent" type="button" (click)="openRunDigest()">
          <mat-icon>auto_awesome</mat-icon>
          Run Weekly Digest
        </button>
      </app-research-section-header>

      @if (!workspaceId()) {
        <mat-card class="hint-card">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace to view digests.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!digests().length) {
        <app-research-empty-state
          icon="summarize"
          title="No digests yet"
          description="Run a digest for a date range to generate a narrative summary of research activity."
          actionLabel="Run Weekly Digest"
          (action)="openRunDigest()"
        />
      } @else {
        <div class="digest-grid">
          @for (d of digests(); track d.id) {
            <mat-card class="digest-card">
              <mat-card-header>
                <mat-card-title>{{ d.title }}</mat-card-title>
                <mat-card-subtitle>
                  {{ d.periodStart | date: 'mediumDate' }} — {{ d.periodEnd | date: 'mediumDate' }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="meta">Created {{ d.createdAt | date: 'medium' }}</p>
              </mat-card-content>
              <mat-card-actions align="end">
                <a mat-stroked-button color="primary" [routerLink]="['/research/digests', d.id]">
                  View
                  <mat-icon iconPositionEnd>chevron_right</mat-icon>
                </a>
              </mat-card-actions>
            </mat-card>
          }
        </div>
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
      .digest-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }
      .digest-card {
        display: flex;
        flex-direction: column;
      }
      .meta {
        font-size: 13px;
        color: #757575;
        margin: 0;
      }
    `,
  ],
})
export class DigestsListComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly digests = signal<DigestReportResponse[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.digests.set([]);
      return;
    }
    this.loading.set(true);
    this.api.listDigests(ws).subscribe({
      next: (list) => {
        this.digests.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load digests.');
      },
    });
  }

  openRunDigest(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.notify.error('Select a workspace first.');
      return;
    }
    const ref = this.dialog.open(RunDigestDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((result: { periodStart: string; periodEnd: string } | undefined) => {
      if (!result?.periodStart || !result?.periodEnd) return;
      const c = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Run digest with AI?',
          message:
            'A workflow will analyze research for the selected range. This may use AI credits. Do you want to continue?',
          confirmLabel: 'Run digest',
        },
      });
      c.afterClosed().subscribe((ok) => {
        if (!ok) return;
        this.aiApi.runDigest(ws, { periodStart: result.periodStart, periodEnd: result.periodEnd }).subscribe({
          next: () => {
            this.notify.success('Digest run started.');
            this.reload();
          },
          error: () => this.notify.error('Digest run failed.'),
        });
      });
    });
  }
}
