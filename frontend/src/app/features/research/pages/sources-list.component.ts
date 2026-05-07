import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import {
  CompetitorResponse,
  IngestUrlRequest,
  SourceResponse,
  SNAPSHOT_TYPES,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

// ────────────────────────────────────────────────
// Ingest URL dialog
// ────────────────────────────────────────────────
@Component({
  selector: 'app-ingest-url-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dlg-ico">add_link</mat-icon> Ingest URL
    </h2>
    <mat-dialog-content class="dlg">
      <p class="dlg-help">
        Paste a URL and optionally include the page text. This creates a <strong>Source</strong>
        (the origin) and a <strong>Snapshot</strong> (a point-in-time capture). The snapshot
        becomes evidence you can cite in insights or send to AI for analysis.
      </p>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="title" name="t" required placeholder="e.g. Acme Corp pricing page" />
        <mat-hint>A human-readable label for this source</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>URL</mat-label>
        <input matInput [(ngModel)]="url" name="u" required placeholder="https://acme.com/pricing" />
        <mat-hint>The original location of this content</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Snapshot type</mat-label>
        <mat-select [(ngModel)]="snapshotType" name="st">
          @for (t of snapshotTypes; track t) {
            <mat-option [value]="t">{{ formatType(t) }}</mat-option>
          }
        </mat-select>
        <mat-hint>What kind of content is this? Helps categorize snapshots.</mat-hint>
      </mat-form-field>

      @if (competitors.length) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>Link to competitor (optional)</mat-label>
          <mat-select [(ngModel)]="competitorId" name="cid">
            <mat-option value="">— None —</mat-option>
            @for (c of competitors; track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
          <mat-hint>Associate this source with a competitor for organized tracking</mat-hint>
        </mat-form-field>
      }

      <mat-form-field appearance="outline" class="full">
        <mat-label>Raw text (paste page content)</mat-label>
        <textarea matInput rows="5" [(ngModel)]="rawText" name="rt"
          placeholder="Paste the page text, ad copy, or transcript here…"></textarea>
        <mat-hint>The actual content from this URL. AI features work best when raw text is provided.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Summary (optional)</mat-label>
        <textarea matInput rows="2" [(ngModel)]="summaryText" name="sm"
          placeholder="Brief summary of the content — or let AI summarize later"></textarea>
        <mat-hint>Write your own summary or leave blank and use AI Summarize on the snapshot later</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button"
        [disabled]="!title.trim() || !url.trim()" (click)="save()">
        <mat-icon>add_link</mat-icon> Ingest
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 460px; padding-top: 4px; display: flex; flex-direction: column; gap: 4px; }
    .dlg-ico { vertical-align: middle; margin-right: 6px; color: #1976d2; }
    .dlg-help { color: #616161; font-size: 13px; margin: 0 0 12px; line-height: 1.55; }
    .dlg-help strong { color: #333; }
    .full { width: 100%; }
  `],
})
export class IngestUrlDialogComponent {
  readonly ref = inject(MatDialogRef<IngestUrlDialogComponent, IngestUrlRequest | undefined>);
  readonly snapshotTypes = SNAPSHOT_TYPES;
  competitors: CompetitorResponse[] = [];

  title = '';
  url = '';
  snapshotType = 'WEB_PAGE';
  competitorId = '';
  rawText = '';
  summaryText = '';

  save(): void {
    const req: IngestUrlRequest = {
      title: this.title.trim(),
      url: this.url.trim(),
      snapshotType: this.snapshotType,
      competitorId: this.competitorId || undefined,
      rawText: this.rawText.trim() || undefined,
      summaryText: this.summaryText.trim() || undefined,
    };
    this.ref.close(req);
  }

  formatType(t: string): string {
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bUrl\b/, 'URL').replace(/\bPdf\b/, 'PDF');
  }
}

// ────────────────────────────────────────────────
// Sources list page
// ────────────────────────────────────────────────
@Component({
  selector: 'app-sources-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    ResearchEmptyStateComponent,
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
            <span>Sources</span>
          </nav>
          <h1>Sources</h1>
          <p class="subtitle">
            Sources are the raw research material you bring into the system — URLs, files, or notes.
            Each ingestion creates a <strong>Source</strong> (the origin) and at least one
            <strong>Snapshot</strong> (a frozen capture of the content at that moment).
            Snapshots are the foundation for everything downstream:
            <a routerLink="/research/insights">Insights</a>,
            <a routerLink="/research/keyword-clusters">Keyword Clusters</a>,
            and AI analysis.
          </p>
        </div>
        <button mat-flat-button color="primary" type="button" (click)="openIngest()"
          matTooltip="Paste a URL and its content to create a source + snapshot">
          <mat-icon>add_link</mat-icon> Ingest URL
        </button>
      </header>

      <!-- Guide card -->
      <mat-card class="guide-card">
        <mat-icon class="guide-ico">help_outline</mat-icon>
        <div>
          <strong>How sources and snapshots work</strong>
          <div class="guide-flow">
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>add_link</mat-icon></div>
              <strong>1. Ingest</strong>
              <span>Paste a URL + text, upload a file, or write notes</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>photo_camera</mat-icon></div>
              <strong>2. Snapshot created</strong>
              <span>A frozen copy of the content at this moment</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>auto_awesome</mat-icon></div>
              <strong>3. Analyze</strong>
              <span>AI Summarize, Extract, or cite as evidence</span>
            </div>
          </div>
          <ul class="guide-tips">
            <li>
              <strong>Link to a competitor</strong> — set the competitor field when ingesting so the source
              appears on the <a routerLink="/research/competitors">Competitor detail page</a> and is available for AI extraction
            </li>
            <li>
              <strong>Paste the full text</strong> — AI features like "Summarize" and "Extract" need raw text to work.
              Without text content, the snapshot will only contain metadata.
            </li>
            <li>
              <strong>No automated scraping</strong> — this system uses manual ingestion for compliance and accuracy.
              Copy-paste the content you want to analyze.
            </li>
          </ul>
        </div>
      </mat-card>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon class="callout-ico">workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Pick a workspace from the sidebar. Sources are scoped per workspace.</p>
          </div>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!rows().length) {
        <app-research-empty-state
          icon="add_link"
          title="No sources yet"
          description="Ingest your first URL to create a source and snapshot. Start with a competitor's pricing page, a social media post, or any content you want to analyze."
          actionLabel="Ingest Your First URL"
          (action)="openIngest()"
        />
        <mat-card class="empty-examples">
          <strong>Example sources to get started</strong>
          <div class="example-grid">
            <div class="example-item">
              <mat-icon>web</mat-icon>
              <div>
                <strong>Competitor pricing page</strong>
                <span>Paste the pricing text → AI can extract offers and pricing insights</span>
              </div>
            </div>
            <div class="example-item">
              <mat-icon>campaign</mat-icon>
              <div>
                <strong>Social media ad</strong>
                <span>Copy ad text + landing page → Extract creative patterns and hooks</span>
              </div>
            </div>
            <div class="example-item">
              <mat-icon>rate_review</mat-icon>
              <div>
                <strong>Customer review</strong>
                <span>Paste review text → Build audience personas and pain points</span>
              </div>
            </div>
            <div class="example-item">
              <mat-icon>search</mat-icon>
              <div>
                <strong>Search results / keyword data</strong>
                <span>Paste keyword list → AI can cluster by intent</span>
              </div>
            </div>
          </div>
        </mat-card>
      } @else {
        <!-- Summary strip -->
        <div class="summary-strip">
          <div class="strip-stat" matTooltip="Total sources in this workspace">
            <strong>{{ rows().length }}</strong> source{{ rows().length !== 1 ? 's' : '' }}
          </div>
          <div class="strip-stat" matTooltip="Sources linked to a specific competitor">
            <mat-icon class="strip-ico">business</mat-icon>
            {{ linkedCount() }} linked to competitors
          </div>
          <div class="strip-stat" matTooltip="Sources not yet associated with any competitor">
            <mat-icon class="strip-ico">link_off</mat-icon>
            {{ unlinkedCount() }} unlinked
          </div>
        </div>

        <mat-card class="table-card">
          <p class="table-help">
            Click a source to see its snapshots. Each snapshot is a frozen capture of the content
            that can be summarized with AI or cited as evidence in insights.
          </p>
          <table mat-table [dataSource]="rows()" class="full-table">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="The label you gave this source when ingesting">Title</span>
              </th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/research/sources', row.id]" class="src-link">
                  <mat-icon class="src-ico">{{ sourceIcon(row.sourceType) }}</mat-icon>
                  {{ row.title }}
                </a>
              </td>
            </ng-container>
            <ng-container matColumnDef="sourceType">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="How this source was ingested: URL paste, file upload, manual note, etc.">Type</span>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-chip-option disabled selected class="type-chip">{{ formatType(row.sourceType) }}</mat-chip-option>
              </td>
            </ng-container>
            <ng-container matColumnDef="url">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="The original URL of this content (if applicable)">Origin URL</span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (row.url) {
                  <a [href]="row.url" target="_blank" rel="noopener noreferrer" class="url-link"
                    matTooltip="Opens original URL in a new tab">
                    <mat-icon class="tiny-ico">open_in_new</mat-icon>
                    {{ shortenUrl(row.url) }}
                  </a>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="competitor">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="The competitor this source is associated with, if any">Competitor</span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (row.competitorId) {
                  <a [routerLink]="['/research/competitors', row.competitorId]" class="comp-link"
                    matTooltip="Go to competitor detail page">
                    <mat-icon class="tiny-ico">business</mat-icon>
                    {{ competitorName(row.competitorId) }}
                  </a>
                } @else {
                  <span class="muted">Not linked</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Ingested</th>
              <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'mediumDate' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" (click)="remove(row)"
                  matTooltip="Delete this source and its snapshots">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card>

        <!-- Next steps -->
        <mat-card class="next-steps">
          <mat-icon class="ns-ico">arrow_forward</mat-icon>
          <div>
            <strong>What to do next</strong>
            <p>
              Click a source to see its <strong>snapshots</strong>. From there you can open a snapshot
              and use <strong>AI Summarize</strong> to extract key points, sentiment, and entities.
              Or go to a <a routerLink="/research/competitors">Competitor's detail page</a>
              to run <strong>AI Extract</strong> across multiple snapshots at once.
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
    .subtitle { margin: 0; color: #555; font-size: 14px; line-height: 1.55; max-width: 680px; }
    .subtitle a { color: #1976d2; text-decoration: none; }
    .subtitle a:hover { text-decoration: underline; }
    .subtitle strong { color: #333; }

    /* Guide card */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card strong { font-size: 14px; }
    .guide-flow {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin: 12px 0; padding: 12px 16px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;
    }
    .flow-step { text-align: center; min-width: 110px; flex: 1; }
    .flow-circle {
      width: 40px; height: 40px; border-radius: 50%; background: #e3f2fd;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 6px;
    }
    .flow-circle mat-icon { color: #1565c0; font-size: 20px; width: 20px; height: 20px; }
    .flow-step strong { display: block; font-size: 12px; color: #333; }
    .flow-step span { font-size: 11px; color: #777; line-height: 1.4; }
    .flow-arrow { color: #bdbdbd; font-size: 20px; width: 20px; height: 20px; }
    .guide-tips { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-tips li { margin-bottom: 2px; }
    .guide-tips a { color: #1976d2; text-decoration: none; }
    .guide-tips a:hover { text-decoration: underline; }

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

    /* Empty examples */
    .empty-examples { padding: 20px 24px !important; margin-top: 16px; }
    .empty-examples > strong { font-size: 14px; color: #333; }
    .example-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
    .example-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
    }
    .example-item mat-icon { color: #546e7a; margin-top: 2px; flex-shrink: 0; }
    .example-item strong { display: block; font-size: 13px; color: #333; }
    .example-item span { font-size: 12px; color: #777; line-height: 1.4; }

    /* Summary strip */
    .summary-strip {
      display: flex; gap: 24px; flex-wrap: wrap;
      padding: 10px 16px; margin-bottom: 16px;
      background: #f5f5f5; border-radius: 8px; font-size: 13px; color: #555;
    }
    .strip-stat { display: flex; align-items: center; gap: 4px; }
    .strip-stat strong { color: #1976d2; }
    .strip-ico { font-size: 16px; width: 16px; height: 16px; color: #888; }

    /* Table */
    .table-card { padding: 16px 20px 8px; margin-bottom: 20px; }
    .table-help { margin: 0 0 12px; font-size: 13px; color: #888; }
    .full-table { width: 100%; }
    .src-link {
      display: inline-flex; align-items: center; gap: 6px;
      text-decoration: none; color: #1a1a2e; font-weight: 500;
    }
    .src-link:hover { color: #1976d2; }
    .src-ico { font-size: 18px; width: 18px; height: 18px; color: #546e7a; }
    .type-chip { font-size: 11px !important; }
    .url-link {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 13px; color: #1976d2; text-decoration: none;
      max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .url-link:hover { text-decoration: underline; }
    .comp-link {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 13px; color: #1976d2; text-decoration: none;
    }
    .comp-link:hover { text-decoration: underline; }
    .tiny-ico { font-size: 14px; width: 14px; height: 14px; color: #999; }
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
export class SourcesListComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly rows = signal<SourceResponse[]>([]);
  readonly competitors = signal<CompetitorResponse[]>([]);
  readonly loading = signal(false);
  readonly columns = ['title', 'sourceType', 'url', 'competitor', 'createdAt', 'actions'];

  readonly linkedCount = computed(() => this.rows().filter(r => r.competitorId).length);
  readonly unlinkedCount = computed(() => this.rows().filter(r => !r.competitorId).length);

  private competitorMap = new Map<string, string>();

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) { this.rows.set([]); return; }
    this.loading.set(true);
    this.api.listSources(ws).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.api.listCompetitors(ws).subscribe({
          next: (comps) => {
            this.competitors.set(comps);
            this.competitorMap.clear();
            comps.forEach(c => this.competitorMap.set(c.id, c.name));
            this.loading.set(false);
          },
          error: () => { this.loading.set(false); },
        });
      },
      error: () => { this.loading.set(false); this.notify.error('Could not load sources.'); },
    });
  }

  openIngest(): void {
    const ws = this.workspaceId();
    if (!ws) { this.notify.error('Select a workspace first.'); return; }
    const ref = this.dialog.open(IngestUrlDialogComponent, { width: '540px' });
    ref.componentInstance.competitors = this.competitors();
    ref.afterClosed().subscribe((req: IngestUrlRequest | undefined) => {
      if (!req) return;
      this.api.ingestUrl(ws, req).subscribe({
        next: () => { this.notify.success('URL ingested — source and snapshot created.'); this.reload(); },
        error: () => this.notify.error('Ingest failed. Check URL and try again.'),
      });
    });
  }

  remove(row: SourceResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    if (!window.confirm(
      `Delete source "${row.title}"?\n\nThis will also remove all snapshots under this source. Any insights citing those snapshots will lose their evidence.`
    )) return;
    this.api.deleteSource(ws, row.id).subscribe({
      next: () => { this.notify.success('Source removed.'); this.reload(); },
      error: () => this.notify.error('Could not delete source.'),
    });
  }

  competitorName(id: string): string {
    return this.competitorMap.get(id) ?? id.substring(0, 8) + '…';
  }

  shortenUrl(url: string): string {
    try { return new URL(url).hostname; }
    catch { return url.length > 35 ? url.substring(0, 35) + '…' : url; }
  }

  sourceIcon(type: string): string {
    switch (type) {
      case 'URL': return 'link';
      case 'FILE_UPLOAD': return 'upload_file';
      case 'MANUAL': return 'edit_note';
      case 'NOTE': return 'sticky_note_2';
      case 'INTEGRATION_RESOURCE': return 'extension';
      default: return 'description';
    }
  }

  formatType(t: string): string {
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
