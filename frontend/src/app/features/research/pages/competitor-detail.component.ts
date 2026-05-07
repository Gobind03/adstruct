import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { AiHistoryPanelComponent } from '../components/ai-history-panel.component';
import { StatusChipComponent } from '../components/status-chip.component';
import {
  CompetitorResponse,
  HandleCreateRequest,
  HandleResponse,
  ResearchAiRunLinkResponse,
  SnapshotResponse,
  SourceResponse,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

@Component({
  selector: 'app-competitor-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    AiHistoryPanelComponent, StatusChipComponent,
    MatButtonModule, MatCardModule, MatChipsModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule,
    MatSelectModule, MatTableModule, MatTooltipModule,
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
      } @else if (!competitor()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Competitor not found</strong>
            <p>It may have been deleted, or you don't have access. <a routerLink="/research/competitors">Back to list</a></p>
          </div>
        </mat-card>
      } @else {

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <a routerLink="/research/overview">Research</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <a routerLink="/research/competitors">Competitors</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>{{ competitor()!.name }}</span>
        </nav>

        <!-- Competitor info -->
        <mat-card class="info-card">
          <div class="info-header">
            <div class="info-left">
              <div class="info-title-row">
                <mat-icon class="info-ico">business</mat-icon>
                <h1>{{ competitor()!.name }}</h1>
                <app-status-chip type="job" [status]="competitor()!.status" />
              </div>
              @if (competitor()!.websiteUrl) {
                <a [href]="competitor()!.websiteUrl!" target="_blank" rel="noopener noreferrer" class="website-link">
                  <mat-icon class="tiny-ico">open_in_new</mat-icon>
                  {{ competitor()!.websiteUrl }}
                </a>
              }
              @if (competitor()!.description) {
                <p class="info-desc">{{ competitor()!.description }}</p>
              }
            </div>
            <div class="info-stats">
              <div class="mini-stat" matTooltip="Sources linked to this competitor">
                <strong>{{ linkedSources().length }}</strong>
                <span>Sources</span>
              </div>
              <div class="mini-stat" matTooltip="Snapshots available for AI analysis">
                <strong>{{ snapshotsForCompetitor().length }}</strong>
                <span>Snapshots</span>
              </div>
              <div class="mini-stat" matTooltip="Handles / profiles attached">
                <strong>{{ handles().length }}</strong>
                <span>Handles</span>
              </div>
            </div>
          </div>
          <p class="info-meta">Added {{ competitor()!.createdAt | date: 'mediumDate' }}</p>
        </mat-card>

        <!-- ═══ External Handles ═══ -->
        <mat-card class="section-card">
          <div class="sec-head">
            <div>
              <h2><mat-icon class="sec-ico">alternate_email</mat-icon> External Handles</h2>
              <p class="sec-desc">
                Attach social profiles, ad library IDs, or any external identifier for this competitor.
                These help you remember where to check for new content to ingest.
              </p>
            </div>
          </div>

          <div class="inline-form">
            <mat-form-field appearance="outline" class="f1">
              <mat-label>Platform</mat-label>
              <input matInput [(ngModel)]="newPlatform" name="np" placeholder="e.g. FACEBOOK" />
              <mat-hint>e.g. FACEBOOK, INSTAGRAM, TIKTOK, GOOGLE_ADS</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="f1">
              <mat-label>Handle / ID</mat-label>
              <input matInput [(ngModel)]="newHandle" name="nh" placeholder="e.g. acmecorp" />
              <mat-hint>Username, page ID, or ad library ID</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="f2">
              <mat-label>Profile URL (optional)</mat-label>
              <input matInput [(ngModel)]="newHandleUrl" name="nu" placeholder="https://facebook.com/acmecorp" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="button" (click)="addHandle()"
              [disabled]="!newPlatform.trim() || !newHandle.trim()"
              matTooltip="Add this handle to the competitor">
              <mat-icon>add</mat-icon> Add
            </button>
          </div>

          @if (!handles().length) {
            <div class="empty-hint">
              <mat-icon>info_outline</mat-icon>
              <span>No handles added yet. Add social profiles so you know where to look for content to ingest.</span>
            </div>
          } @else {
            <table mat-table [dataSource]="handles()" class="full-table">
              <ng-container matColumnDef="platform">
                <th mat-header-cell *matHeaderCellDef>Platform</th>
                <td mat-cell *matCellDef="let h">
                  <mat-chip-option disabled selected class="plat-chip">{{ h.platformType }}</mat-chip-option>
                </td>
              </ng-container>
              <ng-container matColumnDef="handle">
                <th mat-header-cell *matHeaderCellDef>Handle / ID</th>
                <td mat-cell *matCellDef="let h" class="mono">{{ h.handle }}</td>
              </ng-container>
              <ng-container matColumnDef="url">
                <th mat-header-cell *matHeaderCellDef>URL</th>
                <td mat-cell *matCellDef="let h">
                  @if (h.url) {
                    <a [href]="h.url" target="_blank" rel="noopener noreferrer" class="url-link">
                      <mat-icon class="tiny-ico">open_in_new</mat-icon> {{ shortenUrl(h.url) }}
                    </a>
                  } @else { <span class="muted">—</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let h">
                  <button mat-icon-button type="button" (click)="removeHandle(h)"
                    matTooltip="Remove this handle">
                    <mat-icon>close</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="handleColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: handleColumns"></tr>
            </table>
          }
        </mat-card>

        <!-- ═══ Linked Sources ═══ -->
        <mat-card class="section-card">
          <div class="sec-head">
            <div>
              <h2><mat-icon class="sec-ico">add_link</mat-icon> Linked Sources</h2>
              <p class="sec-desc">
                Sources whose <code>competitorId</code> matches this competitor.
                To link a new source, go to
                <a routerLink="/research/sources">Sources</a> and set the competitor field when ingesting.
              </p>
            </div>
          </div>

          @if (!linkedSources().length) {
            <div class="empty-hint">
              <mat-icon>info_outline</mat-icon>
              <span>
                No sources linked yet.
                <a routerLink="/research/sources">Ingest a URL or file</a> and set this competitor
                to link it automatically.
              </span>
            </div>
          } @else {
            <table mat-table [dataSource]="linkedSources()" class="full-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Title</th>
                <td mat-cell *matCellDef="let s">
                  <a [routerLink]="['/research/sources', s.id]">{{ s.title }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="sourceType">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let s">
                  <mat-chip-option disabled selected class="type-chip">{{ s.sourceType }}</mat-chip-option>
                </td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Added</th>
                <td mat-cell *matCellDef="let s">{{ s.createdAt | date: 'mediumDate' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="sourceColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: sourceColumns"></tr>
            </table>
          }
        </mat-card>

        <!-- ═══ AI Extract ═══ -->
        <mat-card class="section-card ai-section">
          <div class="sec-head">
            <div>
              <h2><mat-icon class="sec-ico ai-ico">auto_awesome</mat-icon> AI Extract — Competitor Insights</h2>
              <p class="sec-desc">
                Select one or more snapshots linked to this competitor and let AI extract structured insights
                (offers, pricing, positioning). Results are created as <strong>draft insights</strong> with
                evidence citations pointing back to the snapshots used.
              </p>
            </div>
          </div>

          @if (!snapshotsForCompetitor().length) {
            <div class="empty-hint">
              <mat-icon>info_outline</mat-icon>
              <span>
                No snapshots available for this competitor.
                First <a routerLink="/research/sources">ingest a source</a> linked to this competitor.
                Each ingestion creates a snapshot you can then analyze here.
              </span>
            </div>
          } @else {
            <div class="extract-row">
              <mat-form-field appearance="outline" class="snap-select">
                <mat-label>Select snapshots to analyze</mat-label>
                <mat-select [(ngModel)]="selectedSnapshotIds" name="ss" multiple>
                  @for (sn of snapshotsForCompetitor(); track sn.id) {
                    <mat-option [value]="sn.id">
                      {{ sn.title || 'Untitled' }} ({{ sn.snapshotType }}, {{ sn.capturedAt | date: 'shortDate' }})
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>Choose which snapshots AI should read to extract insights</mat-hint>
              </mat-form-field>
              <button mat-flat-button color="accent" type="button"
                [disabled]="!selectedSnapshotIds.length || extracting()"
                (click)="runExtract()"
                matTooltip="AI will read the selected snapshots and create draft insights with evidence citations">
                @if (extracting()) {
                  <mat-spinner diameter="18" class="btn-spin" />
                } @else {
                  <mat-icon>auto_awesome</mat-icon>
                }
                AI Extract
              </button>
            </div>
            <div class="extract-hint">
              <mat-icon class="hint-ico">tips_and_updates</mat-icon>
              <span>
                AI outputs are always drafts. Review them on the
                <a routerLink="/research/insights">Insights page</a>,
                add or verify evidence, then publish.
              </span>
            </div>
          }
        </mat-card>

        <!-- ═══ AI History ═══ -->
        @if (aiLinks().length) {
          <mat-card class="section-card">
            <div class="sec-head">
              <div>
                <h2><mat-icon class="sec-ico">history</mat-icon> AI Run History</h2>
                <p class="sec-desc">
                  Past AI operations that used snapshots linked to this competitor.
                  Click a run to see what was produced.
                </p>
              </div>
            </div>
            <app-ai-history-panel [aiLinks]="aiLinks()" [expanded]="false" />
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
    .website-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #1976d2; text-decoration: none; margin-bottom: 6px; }
    .website-link:hover { text-decoration: underline; }
    .info-desc { margin: 0; font-size: 14px; color: #555; line-height: 1.5; }
    .info-stats { display: flex; gap: 16px; }
    .mini-stat { text-align: center; min-width: 64px; cursor: default; }
    .mini-stat strong { display: block; font-size: 22px; font-weight: 600; color: #1976d2; }
    .mini-stat span { font-size: 11px; color: #888; }
    .info-meta { margin: 10px 0 0; font-size: 12px; color: #999; }

    /* Sections */
    .section-card { padding: 20px 24px; margin-bottom: 20px; }
    .sec-head { margin-bottom: 16px; }
    h2 { margin: 0 0 4px; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .sec-ico { font-size: 20px; width: 20px; height: 20px; color: #1976d2; }
    .ai-ico { color: #7b1fa2; }
    .sec-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; max-width: 640px; }
    .sec-desc a, .sec-desc code { color: #1976d2; }
    .sec-desc code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 12px; }

    /* Empty hint */
    .empty-hint { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fafafa; border-radius: 8px; border: 1px dashed #e0e0e0; }
    .empty-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #9e9e9e; margin-top: 1px; flex-shrink: 0; }
    .empty-hint span { font-size: 13px; color: #757575; line-height: 1.5; }
    .empty-hint a { color: #1976d2; text-decoration: none; }
    .empty-hint a:hover { text-decoration: underline; }

    /* Forms */
    .inline-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin-bottom: 14px; }
    .f1 { flex: 1; min-width: 140px; }
    .f2 { flex: 2; min-width: 200px; }
    .full-table { width: 100%; }
    .mono { font-family: monospace; font-size: 13px; }
    .plat-chip, .type-chip { font-size: 12px !important; }
    .url-link { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; color: #1976d2; text-decoration: none; }
    .url-link:hover { text-decoration: underline; }
    .tiny-ico { font-size: 14px; width: 14px; height: 14px; color: #999; }
    .muted { color: #bdbdbd; font-size: 13px; }

    /* AI extract */
    .ai-section { border-left: 3px solid #ce93d8; }
    .extract-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .snap-select { min-width: 300px; flex: 1; }
    .btn-spin { display: inline-block; }
    .extract-hint { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; background: #fffde7; border-radius: 8px; }
    .hint-ico { font-size: 18px; width: 18px; height: 18px; color: #f9a825; flex-shrink: 0; margin-top: 1px; }
    .extract-hint span { font-size: 12px; color: #5d4037; line-height: 1.5; }
    .extract-hint a { color: #1976d2; text-decoration: none; }
  `],
})
export class CompetitorDetailComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly competitorId = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });
  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(false);
  readonly competitor = signal<CompetitorResponse | null>(null);
  readonly handles = signal<HandleResponse[]>([]);
  readonly allSources = signal<SourceResponse[]>([]);
  readonly allSnapshots = signal<SnapshotResponse[]>([]);
  readonly aiLinks = signal<ResearchAiRunLinkResponse[]>([]);
  readonly extracting = signal(false);

  newPlatform = '';
  newHandle = '';
  newHandleUrl = '';
  selectedSnapshotIds: string[] = [];

  readonly linkedSources = computed(() => {
    const cid = this.competitor()?.id;
    if (!cid) return [];
    return this.allSources().filter(s => s.competitorId === cid);
  });

  readonly snapshotsForCompetitor = computed(() => {
    const ids = new Set(this.linkedSources().map(s => s.id));
    return this.allSnapshots().filter(sn => ids.has(sn.sourceId));
  });

  readonly handleColumns = ['platform', 'handle', 'url', 'actions'];
  readonly sourceColumns = ['title', 'sourceType', 'createdAt'];

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    const id = this.competitorId();
    if (!ws || !id) { this.competitor.set(null); return; }
    this.loading.set(true);
    this.api.getCompetitor(ws, id).subscribe({
      next: c => { this.competitor.set(c); this.loadSecondary(ws, id); },
      error: () => { this.loading.set(false); this.competitor.set(null); this.notify.error('Could not load competitor.'); },
    });
  }

  private loadSecondary(ws: string, competitorId: string): void {
    forkJoin({
      handles: this.api.listHandles(ws, competitorId),
      sources: this.api.listSources(ws),
      snapshots: this.api.listSnapshots(ws),
      aiLinks: this.aiApi.listAiLinks(ws),
    }).subscribe({
      next: ({ handles, sources, snapshots, aiLinks }) => {
        this.handles.set(handles);
        this.allSources.set(sources);
        this.allSnapshots.set(snapshots);
        const sourceIds = new Set(sources.filter(s => s.competitorId === competitorId).map(s => s.id));
        const snapIds = new Set(snapshots.filter(sn => sourceIds.has(sn.sourceId)).map(sn => sn.id));
        this.aiLinks.set(aiLinks.filter(l => l.snapshotIds.some(sid => snapIds.has(sid))));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notify.error('Could not load competitor details.'); },
    });
  }

  addHandle(): void {
    const ws = this.workspaceId();
    const comp = this.competitor();
    if (!ws || !comp) return;
    const platform = this.newPlatform.trim();
    const handle = this.newHandle.trim();
    if (!platform || !handle) { this.notify.error('Platform and handle are required.'); return; }
    const req: HandleCreateRequest = { platformType: platform, handle, url: this.newHandleUrl.trim() || undefined };
    this.api.addHandle(ws, comp.id, req).subscribe({
      next: h => {
        this.handles.update(list => [...list, h]);
        this.newPlatform = '';
        this.newHandle = '';
        this.newHandleUrl = '';
        this.notify.success('Handle added.');
      },
      error: () => this.notify.error('Could not add handle. It may already exist for this platform.'),
    });
  }

  removeHandle(h: HandleResponse): void {
    const ws = this.workspaceId();
    const comp = this.competitor();
    if (!ws || !comp) return;
    if (!window.confirm(`Remove ${h.platformType} handle "${h.handle}"?`)) return;
    this.api.removeHandle(ws, comp.id, h.id).subscribe({
      next: () => { this.handles.update(list => list.filter(x => x.id !== h.id)); this.notify.success('Handle removed.'); },
      error: () => this.notify.error('Could not remove handle.'),
    });
  }

  runExtract(): void {
    const ws = this.workspaceId();
    const comp = this.competitor();
    if (!ws || !comp || !this.selectedSnapshotIds.length) return;
    if (!window.confirm(
      `Run AI extraction on ${this.selectedSnapshotIds.length} snapshot(s)?\n\n` +
      'AI will read these snapshots and create draft insights with evidence citations. ' +
      'This may use AI credits.'
    )) return;
    this.extracting.set(true);
    this.aiApi.extractCompetitorInsights(ws, comp.id, { snapshotIds: this.selectedSnapshotIds }).subscribe({
      next: res => {
        this.extracting.set(false);
        this.selectedSnapshotIds = [];
        this.notify.success(`Created ${res.createdInsightIds.length} draft insight(s). Review them on the Insights page.`);
        this.aiApi.listAiLinks(ws).subscribe({
          next: all => {
            const sourceIds = new Set(this.linkedSources().map(s => s.id));
            const snapIds = new Set(this.allSnapshots().filter(sn => sourceIds.has(sn.sourceId)).map(sn => sn.id));
            this.aiLinks.set(all.filter(l => l.snapshotIds.some(sid => snapIds.has(sid))));
          },
        });
      },
      error: () => { this.extracting.set(false); this.notify.error('Extraction failed. Make sure the selected snapshots belong to sources linked to this competitor.'); },
    });
  }

  shortenUrl(url: string): string {
    try { return new URL(url).hostname + new URL(url).pathname.substring(0, 20); }
    catch { return url.length > 40 ? url.substring(0, 40) + '…' : url; }
  }
}
