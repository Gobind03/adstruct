import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { StatusChipComponent } from '../components/status-chip.component';
import { CompetitorCreateRequest, CompetitorResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

// ────────────────────────────────────────────────
// Dialog
// ────────────────────────────────────────────────
@Component({
  selector: 'app-add-competitor-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Add competitor</h2>
    <mat-dialog-content class="dlg">
      <p class="dlg-help">
        A competitor is a brand, publisher, or advertiser you want to track.
        You'll link sources and snapshots to this competitor later.
      </p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" name="n" required placeholder="e.g. Acme Corp" />
        <mat-hint>Unique within this workspace</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Website URL</mat-label>
        <input matInput [(ngModel)]="websiteUrl" name="u" placeholder="https://acme.com" />
        <mat-hint>Their primary website — optional but helpful for context</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <textarea matInput rows="3" [(ngModel)]="description" name="d"
          placeholder="What do they do? Why are you tracking them?"></textarea>
        <mat-hint>Internal note for your team</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!name.trim()" (click)="save()">
        <mat-icon>add_business</mat-icon> Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 420px; padding-top: 4px; display: flex; flex-direction: column; gap: 4px; }
    .dlg-help { color: #616161; font-size: 13px; margin: 0 0 12px; line-height: 1.5; }
    .full { width: 100%; }
  `],
})
export class AddCompetitorDialogComponent {
  readonly ref = inject(MatDialogRef<AddCompetitorDialogComponent, CompetitorCreateRequest | undefined>);
  name = '';
  websiteUrl = '';
  description = '';

  save(): void {
    this.ref.close({
      name: this.name.trim(),
      websiteUrl: this.websiteUrl.trim() || undefined,
      description: this.description.trim() || undefined,
    });
  }
}

// ────────────────────────────────────────────────
// List page
// ────────────────────────────────────────────────
@Component({
  selector: 'app-competitors-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    ResearchEmptyStateComponent, StatusChipComponent,
    MatButtonModule, MatCardModule, MatChipsModule, MatDialogModule,
    MatIconModule, MatProgressSpinnerModule, MatTableModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Header -->
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/research/overview">Research</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Competitors</span>
          </nav>
          <h1>Competitors</h1>
          <p class="subtitle">
            Track the brands, publishers, and advertisers you compete with.
            Each competitor acts as a folder that groups related
            <a routerLink="/research/sources" matTooltip="URLs, files, and notes that form your evidence base">sources</a>,
            <a routerLink="/research/insights" matTooltip="Structured findings with evidence and confidence">insights</a>,
            and AI analyses.
          </p>
        </div>
        <button mat-flat-button color="primary" type="button" (click)="openAdd()"
          matTooltip="Create a new competitor to start linking sources and running AI analysis">
          <mat-icon>add_business</mat-icon> Add Competitor
        </button>
      </header>

      <!-- What is this? -->
      <mat-card class="guide-card">
        <mat-icon class="guide-ico">help_outline</mat-icon>
        <div>
          <strong>What is a competitor?</strong>
          <p>
            A competitor is any brand or entity you want to monitor. Once created, you can:
          </p>
          <ul>
            <li>
              <strong>Attach external handles</strong> — social profiles, ad library IDs — so you know where to look
            </li>
            <li>
              <strong>Link sources & snapshots</strong> — when you
              <a routerLink="/research/sources">ingest a URL or file</a>,
              set the competitor field to connect it automatically
            </li>
            <li>
              <strong>Run AI extraction</strong> — select linked snapshots and let AI pull out offers, pricing, and positioning as draft insights
            </li>
            <li>
              <strong>Browse insights</strong> — filter the
              <a routerLink="/research/insights">Insights page</a> by competitor to see everything learned
            </li>
          </ul>
        </div>
      </mat-card>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon class="callout-ico">workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Pick a workspace from the sidebar. Competitors are scoped per workspace.</p>
          </div>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!rows().length) {
        <app-research-empty-state
          icon="business"
          title="No competitors yet"
          description="Add your first competitor to start building competitive intelligence. Once added, you can link sources, attach social handles, and run AI extractions."
          actionLabel="Add Your First Competitor"
          secondaryLabel="Tip: Start with your top 3 competitors and expand from there."
          (action)="openAdd()"
        />
      } @else {
        <mat-card class="table-card">
          <p class="table-help">
            Click a competitor name to see its detail page — external handles, linked sources, and AI extraction tools.
          </p>
          <table mat-table [dataSource]="rows()" class="full-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="The name you assigned to this competitor">Name</span>
              </th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/research/competitors', row.id]" class="comp-link">
                  <mat-icon class="comp-ico">business</mat-icon>
                  {{ row.name }}
                </a>
              </td>
            </ng-container>
            <ng-container matColumnDef="websiteUrl">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="The competitor's primary website">Website</span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (row.websiteUrl) {
                  <a [href]="row.websiteUrl" target="_blank" rel="noopener noreferrer" class="url-link"
                    matTooltip="Opens in a new tab">
                    <mat-icon class="tiny-ico">open_in_new</mat-icon>
                    {{ shortenUrl(row.websiteUrl) }}
                  </a>
                } @else {
                  <span class="muted">Not set</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let row">
                <span class="desc-cell">{{ row.description || '—' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="ACTIVE competitors are actively tracked. ARCHIVED ones are hidden from default views.">Status</span>
              </th>
              <td mat-cell *matCellDef="let row">
                <app-status-chip type="job" [status]="row.status" />
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Added</th>
              <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'mediumDate' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" aria-label="Delete competitor" (click)="remove(row)"
                  matTooltip="Permanently delete this competitor and unlink its sources">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card>

        <!-- Next steps hint -->
        <mat-card class="next-steps">
          <mat-icon class="ns-ico">arrow_forward</mat-icon>
          <div>
            <strong>Next steps</strong>
            <p>
              Click a competitor to open its detail page, then
              <strong>attach external handles</strong> (social profiles, ad library IDs) and
              <a routerLink="/research/sources">ingest sources</a> linked to that competitor.
              Once you have snapshots, use <strong>AI Extract</strong> to automatically generate draft insights.
            </p>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 1100px; margin: 0 auto; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .header-text { flex: 1; min-width: 0; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 4px; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { color: #666; }
    .bc-sep { font-size: 16px; width: 16px; height: 16px; color: #999; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 600; color: #1a1a2e; }
    .subtitle { margin: 0; color: #555; font-size: 14px; line-height: 1.55; max-width: 650px; }
    .subtitle a { color: #1976d2; text-decoration: none; }
    .subtitle a:hover { text-decoration: underline; }

    /* Guide card */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card strong { font-size: 14px; }
    .guide-card p { margin: 4px 0 6px; font-size: 13px; color: #555; line-height: 1.5; }
    .guide-card ul { margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-card ul li { margin-bottom: 2px; }
    .guide-card a { color: #1976d2; text-decoration: none; }
    .guide-card a:hover { text-decoration: underline; }

    /* Callout */
    .callout {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px; border-left: 4px solid;
    }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #555; }
    .callout-ico { margin-top: 2px; flex-shrink: 0; }
    .callout-warn { border-color: #ffa726; background: #fff8e1; }
    .callout-warn .callout-ico { color: #f57c00; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* Table */
    .table-card { padding: 16px 20px 8px; margin-bottom: 20px; }
    .table-help { margin: 0 0 12px; font-size: 13px; color: #888; }
    .full-table { width: 100%; }
    .comp-link {
      display: inline-flex; align-items: center; gap: 6px;
      text-decoration: none; color: #1a1a2e; font-weight: 500;
    }
    .comp-link:hover { color: #1976d2; }
    .comp-ico { font-size: 18px; width: 18px; height: 18px; color: #546e7a; }
    .url-link {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 13px; color: #1976d2; text-decoration: none;
      max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .url-link:hover { text-decoration: underline; }
    .tiny-ico { font-size: 14px; width: 14px; height: 14px; color: #999; }
    .desc-cell { font-size: 13px; color: #666; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: bottom; }
    .muted { color: #bdbdbd; font-size: 13px; }

    /* Next steps */
    .next-steps {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; background: #e8f5e9; border: 1px solid #c8e6c9;
    }
    .ns-ico { color: #2e7d32; margin-top: 2px; flex-shrink: 0; }
    .next-steps strong { font-size: 14px; }
    .next-steps p { margin: 4px 0 0; font-size: 13px; color: #444; line-height: 1.55; }
    .next-steps a { color: #1976d2; text-decoration: none; }
    .next-steps a:hover { text-decoration: underline; }
  `],
})
export class CompetitorsListComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly rows = signal<CompetitorResponse[]>([]);
  readonly loading = signal(false);
  readonly columns = ['name', 'websiteUrl', 'description', 'status', 'createdAt', 'actions'];

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) { this.rows.set([]); return; }
    this.loading.set(true);
    this.api.listCompetitors(ws).subscribe({
      next: (list) => { this.rows.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Could not load competitors.'); },
    });
  }

  openAdd(): void {
    const ws = this.workspaceId();
    if (!ws) { this.notify.error('Select a workspace first.'); return; }
    const ref = this.dialog.open(AddCompetitorDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe((req: CompetitorCreateRequest | undefined) => {
      if (!req) return;
      this.api.createCompetitor(ws, req).subscribe({
        next: () => { this.notify.success('Competitor created.'); this.reload(); },
        error: () => this.notify.error('Could not create competitor. Make sure the name is unique within this workspace.'),
      });
    });
  }

  remove(row: CompetitorResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    if (!window.confirm(
      `Delete competitor "${row.name}"?\n\nThis will unlink all sources from this competitor. Sources and snapshots themselves are not deleted.`
    )) return;
    this.api.deleteCompetitor(ws, row.id).subscribe({
      next: () => { this.notify.success('Competitor removed.'); this.reload(); },
      error: () => this.notify.error('Could not delete competitor.'),
    });
  }

  shortenUrl(url: string): string {
    try { return new URL(url).hostname; }
    catch { return url.length > 40 ? url.substring(0, 40) + '…' : url; }
  }
}
