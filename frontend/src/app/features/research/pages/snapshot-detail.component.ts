import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { StatusChipComponent } from '../components/status-chip.component';
import { SnapshotResponse, SummarizeResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

@Component({
  selector: 'app-snapshot-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    StatusChipComponent,
    MatButtonModule, MatCardModule, MatChipsModule,
    MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
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
      } @else if (!snapshot()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Snapshot not found</strong>
            <p>It may have been deleted. <a routerLink="/research/sources">Back to sources</a></p>
          </div>
        </mat-card>
      } @else {

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <a routerLink="/research/overview">Research</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <a routerLink="/research/sources">Sources</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          @if (snapshot()!.sourceId) {
            <a [routerLink]="['/research/sources', snapshot()!.sourceId]">Source</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
          }
          <span>{{ snapshot()!.title || 'Snapshot' }}</span>
        </nav>

        <!-- Snapshot header card -->
        <mat-card class="info-card">
          <div class="info-header">
            <div class="info-left">
              <div class="info-title-row">
                <mat-icon class="info-ico">photo_camera</mat-icon>
                <h1>{{ snapshot()!.title || 'Untitled snapshot' }}</h1>
                <mat-chip-option disabled selected class="type-chip">{{ formatType(snapshot()!.snapshotType) }}</mat-chip-option>
              </div>
              <p class="info-meta">
                Captured {{ snapshot()!.capturedAt | date: 'medium' }}
                @if (snapshot()!.sentiment) {
                  · Sentiment: <app-status-chip type="sentiment" [status]="snapshot()!.sentiment!" />
                }
              </p>
            </div>
            <div class="info-actions">
              <button mat-flat-button color="accent" type="button"
                [disabled]="summarizing()"
                (click)="summarize()"
                matTooltip="Use AI to extract key points, entities, and sentiment from this snapshot's content">
                @if (summarizing()) {
                  <mat-spinner diameter="18" class="btn-spin" />
                } @else {
                  <mat-icon>auto_awesome</mat-icon>
                }
                AI Summarize
              </button>
            </div>
          </div>
        </mat-card>

        <!-- What is a snapshot? -->
        <mat-card class="guide-card">
          <mat-icon class="guide-ico">help_outline</mat-icon>
          <div>
            <strong>What is a snapshot?</strong>
            <p>
              A snapshot is a <em>frozen capture</em> of content at a specific moment in time.
              It preserves the raw text, metadata, and context from its source.
              Snapshots serve two critical roles:
            </p>
            <ul>
              <li>
                <strong>Evidence for insights</strong> — when you create an
                <a routerLink="/research/insights">Insight</a>,
                you attach snapshots as evidence citations. Insights can't be published without evidence.
              </li>
              <li>
                <strong>Input for AI</strong> — AI Summarize reads this snapshot's raw text to extract
                key points, entities, and sentiment. AI Extract (on the
                <a routerLink="/research/competitors">Competitor page</a>)
                reads multiple snapshots at once to find offers, pricing, and positioning.
              </li>
            </ul>
            <p class="guide-tip">
              <mat-icon class="tip-ico">tips_and_updates</mat-icon>
              <strong>Tip:</strong> The more raw text a snapshot has, the better AI results will be.
              If this snapshot is empty, re-ingest the source with content pasted in.
            </p>
          </div>
        </mat-card>

        <!-- Summary section (shown after AI summarize or if already summarized) -->
        @if (snapshot()!.summaryText || summarizeResult()) {
          <mat-card class="section-card summary-section">
            <div class="sec-head">
              <h2>
                <mat-icon class="sec-ico ai-ico">auto_awesome</mat-icon>
                AI Summary
              </h2>
              <p class="sec-desc">
                Generated by AI from the raw text below. All claims reference this snapshot ID.
              </p>
            </div>

            <div class="summary-body">
              <p class="summary-text">{{ summarizeResult()?.summary || snapshot()!.summaryText }}</p>

              @if (summarizeResult()?.keyPoints?.length) {
                <div class="kp-section">
                  <strong>Key points</strong>
                  <ul class="kp-list">
                    @for (kp of summarizeResult()!.keyPoints; track $index) {
                      <li>{{ kp }}</li>
                    }
                  </ul>
                </div>
              }

              @if (summarizeResult()?.sentiment || snapshot()!.sentiment) {
                <div class="sent-section">
                  <strong>Sentiment:</strong>
                  <app-status-chip type="sentiment" [status]="summarizeResult()?.sentiment || snapshot()!.sentiment!" />
                </div>
              }
            </div>

            <div class="provenance-note">
              <mat-icon class="prov-ico">verified</mat-icon>
              <span>
                This summary cites snapshot <code>{{ snapshot()!.id }}</code> as its sole evidence source.
                No external data was used.
              </span>
            </div>
          </mat-card>
        } @else {
          <!-- No summary yet — prompt to summarize -->
          <mat-card class="section-card prompt-card">
            <div class="prompt-body">
              <mat-icon class="prompt-ico">auto_awesome</mat-icon>
              <div>
                <strong>No AI summary yet</strong>
                <p>
                  Click <strong>"AI Summarize"</strong> above to have AI read the raw content below
                  and extract key points, named entities, and sentiment analysis.
                  The summary will appear here with full provenance tracking.
                </p>
              </div>
            </div>
          </mat-card>
        }

        <!-- Raw content -->
        <mat-card class="section-card">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">article</mat-icon> Raw Content</h2>
            <p class="sec-desc">
              The original text captured from the source.
              This is what AI reads when you run summarization or extraction.
            </p>
          </div>

          @if (snapshot()!.rawText) {
            <pre class="raw-content">{{ snapshot()!.rawText }}</pre>
          } @else {
            <div class="empty-hint">
              <mat-icon>info_outline</mat-icon>
              <span>
                No raw text content. AI Summarize requires text to work.
                Go to <a routerLink="/research/sources">Sources</a> and re-ingest this URL with
                the page content pasted in the "Raw text" field.
              </span>
            </div>
          }
        </mat-card>

        <!-- Tags -->
        @if (parsedTags().length) {
          <mat-card class="section-card">
            <div class="sec-head">
              <h2><mat-icon class="sec-ico">label</mat-icon> Tags</h2>
            </div>
            <div class="tags-row">
              @for (tag of parsedTags(); track tag) {
                <mat-chip-option disabled selected class="tag-chip">{{ tag }}</mat-chip-option>
              }
            </div>
          </mat-card>
        }

        <!-- Cross-references -->
        <mat-card class="section-card">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">link</mat-icon> Related Pages</h2>
            <p class="sec-desc">Navigate to related parts of the research module.</p>
          </div>
          <div class="related-grid">
            <a [routerLink]="['/research/sources', snapshot()!.sourceId]" class="related-item"
              matTooltip="View the source this snapshot was captured from">
              <mat-icon>add_link</mat-icon>
              <div>
                <strong>Parent source</strong>
                <span>View the origin source and other snapshots</span>
              </div>
            </a>
            <a routerLink="/research/insights" class="related-item"
              matTooltip="Create or view insights that cite this snapshot as evidence">
              <mat-icon>lightbulb</mat-icon>
              <div>
                <strong>Insights</strong>
                <span>Create findings backed by this snapshot</span>
              </div>
            </a>
            <a routerLink="/research/competitors" class="related-item"
              matTooltip="Select snapshots on a competitor page for bulk AI extraction">
              <mat-icon>business</mat-icon>
              <div>
                <strong>Competitors</strong>
                <span>Run AI Extract on competitor snapshots</span>
              </div>
            </a>
            <a routerLink="/research/keyword-clusters" class="related-item"
              matTooltip="If this snapshot contains keyword data, use AI to cluster by intent">
              <mat-icon>hub</mat-icon>
              <div>
                <strong>Keywords</strong>
                <span>Cluster keywords from this snapshot</span>
              </div>
            </a>
          </div>
        </mat-card>

      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 960px; margin: 0 auto; }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 12px; flex-wrap: wrap; }
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
    .info-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .info-left { flex: 1; min-width: 0; }
    .info-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
    .info-ico { font-size: 28px; width: 28px; height: 28px; color: #546e7a; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; color: #1a1a2e; }
    .type-chip { font-size: 11px !important; }
    .info-meta { margin: 4px 0 0; font-size: 13px; color: #888; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .info-actions { flex-shrink: 0; }
    .btn-spin { display: inline-block; }

    /* Guide */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card strong { font-size: 14px; }
    .guide-card p { margin: 4px 0 6px; font-size: 13px; color: #555; line-height: 1.5; }
    .guide-card ul { margin: 0 0 6px; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-card a { color: #1976d2; text-decoration: none; }
    .guide-card a:hover { text-decoration: underline; }
    .guide-tip { display: flex; align-items: flex-start; gap: 6px; background: #fffde7; padding: 8px 12px; border-radius: 6px; margin-top: 4px; }
    .tip-ico { font-size: 16px; width: 16px; height: 16px; color: #f9a825; margin-top: 1px; flex-shrink: 0; }

    /* Sections */
    .section-card { padding: 20px 24px; margin-bottom: 20px; }
    .sec-head { margin-bottom: 14px; }
    h2 { margin: 0 0 4px; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .sec-ico { font-size: 20px; width: 20px; height: 20px; color: #1976d2; }
    .ai-ico { color: #7b1fa2; }
    .sec-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }

    /* Summary */
    .summary-section { border-left: 3px solid #ce93d8; }
    .summary-body { margin-bottom: 14px; }
    .summary-text { font-size: 14px; line-height: 1.6; color: #333; margin: 0 0 12px; }
    .kp-section { margin-bottom: 10px; }
    .kp-section strong { font-size: 13px; color: #555; }
    .kp-list { margin: 4px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #444; }
    .sent-section { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; }
    .provenance-note {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; background: #f3e5f5; border-radius: 6px; font-size: 12px; color: #6a1b9a;
    }
    .prov-ico { font-size: 16px; width: 16px; height: 16px; color: #7b1fa2; flex-shrink: 0; margin-top: 1px; }
    .provenance-note code { background: #e1bee7; padding: 1px 5px; border-radius: 3px; font-size: 11px; }

    /* Prompt card */
    .prompt-card { background: #fafafa; border: 1px dashed #e0e0e0; }
    .prompt-body { display: flex; align-items: flex-start; gap: 12px; }
    .prompt-ico { font-size: 32px; width: 32px; height: 32px; color: #ce93d8; flex-shrink: 0; }
    .prompt-body strong { font-size: 14px; color: #333; }
    .prompt-body p { margin: 4px 0 0; font-size: 13px; color: #666; line-height: 1.55; }

    /* Raw content */
    .raw-content {
      white-space: pre-wrap; word-break: break-word;
      font-size: 13px; line-height: 1.6; color: #444;
      margin: 0; padding: 14px 16px;
      background: #fafafa; border: 1px solid #eee; border-radius: 6px;
      max-height: 480px; overflow: auto; font-family: 'Roboto Mono', monospace;
    }

    /* Empty hint */
    .empty-hint { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fff3e0; border-radius: 8px; border: 1px solid #ffe0b2; }
    .empty-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #f57c00; margin-top: 1px; flex-shrink: 0; }
    .empty-hint span { font-size: 13px; color: #5d4037; line-height: 1.5; }
    .empty-hint a { color: #1976d2; text-decoration: none; }
    .empty-hint a:hover { text-decoration: underline; }

    /* Tags */
    .tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag-chip { font-size: 12px !important; }

    /* Related grid */
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .related-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
      text-decoration: none; color: inherit; transition: border-color 0.15s;
    }
    .related-item:hover { border-color: #1976d2; }
    .related-item mat-icon { color: #546e7a; margin-top: 2px; flex-shrink: 0; }
    .related-item strong { display: block; font-size: 13px; color: #333; }
    .related-item span { font-size: 11px; color: #888; line-height: 1.4; }
  `],
})
export class SnapshotDetailComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);

  readonly snapshotId = toSignal(this.route.paramMap.pipe(map(p => p.get('snapshotId') ?? '')), { initialValue: '' });
  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(false);
  readonly summarizing = signal(false);
  readonly snapshot = signal<SnapshotResponse | null>(null);
  readonly summarizeResult = signal<SummarizeResponse | null>(null);

  readonly parsedTags = computed(() => {
    const sn = this.snapshot();
    if (!sn || !sn.tags) return [];
    try { return Array.isArray(sn.tags) ? sn.tags : JSON.parse(sn.tags as any); }
    catch { return []; }
  });

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    const id = this.snapshotId();
    if (!ws || !id) { this.snapshot.set(null); return; }
    this.loading.set(true);
    this.api.getSnapshot(ws, id).subscribe({
      next: sn => { this.snapshot.set(sn); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snapshot.set(null); this.notify.error('Could not load snapshot.'); },
    });
  }

  summarize(): void {
    const ws = this.workspaceId();
    const id = this.snapshotId();
    if (!ws || !id) return;
    const c = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Summarize with AI?',
        message:
          'AI will read the raw text of this snapshot and extract:\n' +
          '• A concise summary\n' +
          '• Key points and named entities\n' +
          '• Sentiment analysis\n\n' +
          'This may use AI credits. The output will cite this snapshot ID as evidence.',
        confirmLabel: 'Summarize',
      },
    });
    c.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.summarizing.set(true);
      this.aiApi.summarizeSnapshot(ws, id, {}).subscribe({
        next: res => {
          this.summarizeResult.set(res);
          this.summarizing.set(false);
          this.notify.success('Summary generated — scroll up to see results.');
          this.api.getSnapshot(ws, id).subscribe({
            next: sn => this.snapshot.set(sn),
          });
        },
        error: () => {
          this.summarizing.set(false);
          this.notify.error('Summarization failed. Ensure the snapshot has raw text content.');
        },
      });
    });
  }

  formatType(t: string): string {
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
