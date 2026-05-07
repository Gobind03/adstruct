import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CompetitorResponse, SnapshotResponse, SourceResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

@Component({
  selector: 'app-source-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatCardModule, MatChipsModule,
    MatIconModule, MatProgressSpinnerModule, MatTableModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace from the sidebar.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!source()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Source not found</strong>
            <p>It may have been deleted, or you don't have access. <a routerLink="/research/sources">Back to sources</a></p>
          </div>
        </mat-card>
      } @else {

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <a routerLink="/research/overview">Research</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <a routerLink="/research/sources">Sources</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>{{ source()!.title }}</span>
        </nav>

        <!-- Source info card -->
        <mat-card class="info-card">
          <div class="info-header">
            <div class="info-left">
              <div class="info-title-row">
                <mat-icon class="info-ico">{{ sourceIcon(source()!.sourceType) }}</mat-icon>
                <h1>{{ source()!.title }}</h1>
                <mat-chip-option disabled selected class="type-chip">{{ formatType(source()!.sourceType) }}</mat-chip-option>
              </div>
              @if (source()!.url) {
                <a [href]="source()!.url!" target="_blank" rel="noopener noreferrer" class="url-link">
                  <mat-icon class="tiny-ico">open_in_new</mat-icon>
                  {{ source()!.url }}
                </a>
              }
              @if (competitorName()) {
                <p class="comp-row">
                  <mat-icon class="tiny-ico">business</mat-icon>
                  Linked to competitor:
                  <a [routerLink]="['/research/competitors', source()!.competitorId!]">{{ competitorName() }}</a>
                </p>
              }
              @if (source()!.noteText) {
                <mat-card class="note-card">
                  <mat-icon class="note-ico">sticky_note_2</mat-icon>
                  <pre class="note-text">{{ source()!.noteText }}</pre>
                </mat-card>
              }
            </div>
            <div class="info-stats">
              <div class="mini-stat" matTooltip="Number of snapshots captured from this source">
                <strong>{{ snapshots().length }}</strong>
                <span>Snapshots</span>
              </div>
            </div>
          </div>
          <p class="info-meta">Ingested {{ source()!.createdAt | date: 'medium' }}</p>
        </mat-card>

        <!-- What is a source? -->
        <mat-card class="guide-card">
          <mat-icon class="guide-ico">help_outline</mat-icon>
          <div>
            <strong>About this source</strong>
            <p>
              A source is the <em>origin</em> of research material — the URL, file, or note you brought in.
              Below are the <strong>snapshots</strong> (point-in-time captures) created from this source.
              Each snapshot freezes the content as it was at ingestion time.
            </p>
            <p>
              <strong>What you can do with snapshots:</strong>
            </p>
            <ul>
              <li>
                <strong>AI Summarize</strong> — click a snapshot to open it, then use "AI Summarize"
                to extract key points, entities, and sentiment
              </li>
              <li>
                <strong>Cite as evidence</strong> — when creating
                <a routerLink="/research/insights">Insights</a>,
                attach snapshots as evidence citations to support your findings
              </li>
              <li>
                <strong>AI Extract</strong> — from the
                <a [routerLink]="source()!.competitorId ? ['/research/competitors', source()!.competitorId!] : ['/research/competitors']">
                  Competitor detail page</a>,
                select multiple snapshots for bulk AI extraction of offers, pricing, and positioning
              </li>
            </ul>
          </div>
        </mat-card>

        <!-- Snapshots section -->
        <mat-card class="section-card">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">photo_camera</mat-icon> Snapshots</h2>
            <p class="sec-desc">
              Point-in-time captures of this source's content. Click a snapshot to view its raw text,
              run AI summarization, or copy its ID for evidence citations.
            </p>
          </div>

          @if (!snapshots().length) {
            <div class="empty-hint">
              <mat-icon>info_outline</mat-icon>
              <span>
                No snapshots yet. Snapshots are created automatically when you ingest a URL or file.
                If this source was created without raw text, re-ingest with content to generate a snapshot.
              </span>
            </div>
          } @else {
            <table mat-table [dataSource]="snapshots()" class="full-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Name or title of this snapshot capture">Title</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <a [routerLink]="['/research/snapshots', row.id]" class="snap-link">
                    <mat-icon class="snap-ico">photo_camera</mat-icon>
                    {{ row.title || row.snapshotType }}
                  </a>
                </td>
              </ng-container>
              <ng-container matColumnDef="snapshotType">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="The kind of content: web page, social post, review, etc.">Type</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-option disabled selected class="type-chip">{{ formatType(row.snapshotType) }}</mat-chip-option>
                </td>
              </ng-container>
              <ng-container matColumnDef="summary">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Whether AI has summarized this snapshot">Summary</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  @if (row.summaryText) {
                    <span class="badge summarized"
                      matTooltip="This snapshot has been summarized">
                      <mat-icon class="badge-ico">check_circle</mat-icon> Summarized
                    </span>
                  } @else {
                    <span class="badge unsummarized"
                      matTooltip="Click into this snapshot and use AI Summarize to extract key points">
                      <mat-icon class="badge-ico">pending</mat-icon> Not yet
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="capturedAt">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="When this content was captured">Captured</span>
                </th>
                <td mat-cell *matCellDef="let row">{{ row.capturedAt | date: 'medium' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          }
        </mat-card>

        <!-- Next steps -->
        @if (snapshots().length) {
          <mat-card class="next-steps">
            <mat-icon class="ns-ico">arrow_forward</mat-icon>
            <div>
              <strong>Next steps</strong>
              <p>
                Click a snapshot above to view its content and run <strong>AI Summarize</strong>.
                @if (unsummarizedCount() > 0) {
                  You have <strong>{{ unsummarizedCount() }}</strong> snapshot{{ unsummarizedCount() > 1 ? 's' : '' }}
                  not yet summarized.
                }
                After summarizing, head to
                <a routerLink="/research/insights">Insights</a>
                to create findings backed by this evidence.
              </p>
            </div>
          </mat-card>
        }

      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 960px; margin: 0 auto; }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 12px; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { color: #666; }
    .bc-sep { font-size: 16px; width: 16px; height: 16px; color: #999; }

    /* Callout */
    .callout { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px !important; margin-bottom: 20px; border-left: 4px solid; }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #555; }
    .callout a { color: #1976d2; }
    .callout-warn { border-color: #ffa726; background: #fff8e1; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* Info card */
    .info-card { padding: 20px 24px; margin-bottom: 20px; }
    .info-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .info-left { flex: 1; min-width: 0; }
    .info-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
    .info-ico { font-size: 28px; width: 28px; height: 28px; color: #546e7a; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; color: #1a1a2e; }
    .type-chip { font-size: 11px !important; }
    .url-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #1976d2; text-decoration: none; margin-bottom: 6px; word-break: break-all; }
    .url-link:hover { text-decoration: underline; }
    .comp-row { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; margin: 4px 0; }
    .comp-row a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .comp-row a:hover { text-decoration: underline; }
    .note-card { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px !important; margin-top: 10px; background: #fffde7; border: 1px solid #fff9c4; }
    .note-ico { color: #f9a825; flex-shrink: 0; font-size: 18px; width: 18px; height: 18px; margin-top: 2px; }
    .note-text { margin: 0; white-space: pre-wrap; font-size: 13px; color: #555; font-family: inherit; }
    .info-stats { display: flex; gap: 16px; }
    .mini-stat { text-align: center; min-width: 64px; cursor: default; }
    .mini-stat strong { display: block; font-size: 22px; font-weight: 600; color: #1976d2; }
    .mini-stat span { font-size: 11px; color: #888; }
    .info-meta { margin: 10px 0 0; font-size: 12px; color: #999; }
    .tiny-ico { font-size: 14px; width: 14px; height: 14px; color: #999; }

    /* Guide */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card strong { font-size: 14px; }
    .guide-card p { margin: 4px 0 6px; font-size: 13px; color: #555; line-height: 1.5; }
    .guide-card ul { margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-card a { color: #1976d2; text-decoration: none; }
    .guide-card a:hover { text-decoration: underline; }

    /* Section */
    .section-card { padding: 20px 24px; margin-bottom: 20px; }
    .sec-head { margin-bottom: 16px; }
    h2 { margin: 0 0 4px; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .sec-ico { font-size: 20px; width: 20px; height: 20px; color: #1976d2; }
    .sec-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }

    /* Empty hint */
    .empty-hint { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fafafa; border-radius: 8px; border: 1px dashed #e0e0e0; }
    .empty-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #9e9e9e; margin-top: 1px; flex-shrink: 0; }
    .empty-hint span { font-size: 13px; color: #757575; line-height: 1.5; }

    /* Table */
    .full-table { width: 100%; }
    .snap-link { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: #1a1a2e; font-weight: 500; }
    .snap-link:hover { color: #1976d2; }
    .snap-ico { font-size: 18px; width: 18px; height: 18px; color: #546e7a; }
    .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; padding: 2px 8px; border-radius: 12px; }
    .badge-ico { font-size: 14px; width: 14px; height: 14px; }
    .summarized { background: #e8f5e9; color: #2e7d32; }
    .summarized .badge-ico { color: #2e7d32; }
    .unsummarized { background: #f5f5f5; color: #9e9e9e; }
    .unsummarized .badge-ico { color: #bdbdbd; }

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
export class SourceDetailComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly sourceId = toSignal(this.route.paramMap.pipe(map(p => p.get('sourceId') ?? '')), { initialValue: '' });
  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(false);
  readonly source = signal<SourceResponse | null>(null);
  readonly snapshots = signal<SnapshotResponse[]>([]);
  private competitorNameVal = signal('');
  readonly competitorName = this.competitorNameVal.asReadonly();

  readonly unsummarizedCount = computed(() => this.snapshots().filter(s => !s.summaryText).length);

  readonly columns = ['title', 'snapshotType', 'summary', 'capturedAt'];

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    const id = this.sourceId();
    if (!ws || !id) { this.source.set(null); return; }
    this.loading.set(true);
    this.api.getSource(ws, id).subscribe({
      next: src => {
        this.source.set(src);
        this.api.listSnapshots(ws).subscribe({
          next: all => {
            this.snapshots.set(all.filter(sn => sn.sourceId === id));
            this.loading.set(false);
          },
          error: () => { this.snapshots.set([]); this.loading.set(false); },
        });
        if (src.competitorId) {
          this.api.getCompetitor(ws, src.competitorId).subscribe({
            next: c => this.competitorNameVal.set(c.name),
            error: () => this.competitorNameVal.set(''),
          });
        }
      },
      error: () => { this.loading.set(false); this.source.set(null); this.notify.error('Could not load source.'); },
    });
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
