import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  CreativeAiRunLinkResponse,
  CreativeAssetResponse,
  CreativeAssetVersionResponse,
  CreativeUsageResponse,
} from '../models/creative.models';
import { CreativeAiApiService } from '../services/creative-ai-api.service';
import { CreativeAssetsApiService } from '../services/creative-assets-api.service';
import { CreativeUsageApiService } from '../services/creative-usage-api.service';

const VERSION_TYPES = ['MINOR', 'MAJOR', 'PATCH', 'DERIVED', 'OTHER'];

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
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
        <div class="spinner-wrap">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (!asset()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Asset not found</strong>
            <p><a routerLink="/creative/assets">Back to assets</a></p>
          </div>
        </mat-card>
      } @else {
        <nav class="breadcrumb">
          <a routerLink="/creative/assets">Creative Assets</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>{{ asset()!.name }}</span>
        </nav>

        <div class="toolbar">
          <button mat-stroked-button type="button" routerLink="/creative/assets">
            <mat-icon>arrow_back</mat-icon>
            Back
          </button>
          <div class="toolbar-actions">
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="enrich()"
              [disabled]="enriching()"
              matTooltip="AI analyzes this asset and suggests tags, descriptions, and metadata improvements. Creates a proposal for your review."
            >
              @if (enriching()) {
                <mat-spinner diameter="20" class="btn-spin"></mat-spinner>
              } @else {
                <mat-icon>auto_awesome</mat-icon>
              }
              AI Enrich Metadata
            </button>
            <button
              mat-stroked-button
              color="warn"
              type="button"
              (click)="archive()"
              [disabled]="archiving()"
              matTooltip="Mark this asset as archived. It will no longer appear in active asset lists."
            >
              Archive
            </button>
          </div>
        </div>

        <mat-card class="context-help">
          <mat-icon class="context-icon">info_outline</mat-icon>
          <div class="context-content">
            <span>This is the full detail view for your asset. You can preview it, review its metadata, manage file versions, and see everywhere it's used. Use <strong>AI Enrich Metadata</strong> to have AI auto-generate tags and descriptions — it creates a review proposal so you stay in control.</span>
            <span class="context-nav">
              Related:
              <a routerLink="/creative/copy">Copy Library</a> &middot;
              <a routerLink="/creative/ai">AI Generator</a> &middot;
              <a routerLink="/creative/usage">Usage & Links</a> &middot;
              <a routerLink="/creative/folders">Folders</a> &middot;
              <a routerLink="/creative/variants">Variant Sets</a>
            </span>
          </div>
        </mat-card>

        <div class="layout">
          <mat-card class="preview-card">
            <div class="preview-inner">
              @if (isImage(asset()!)) {
                <img [src]="asset()!.fileUrl" [alt]="asset()!.name" class="preview-media" />
              } @else if (isVideo(asset()!)) {
                <video [src]="asset()!.fileUrl" controls class="preview-media"></video>
              } @else {
                <div class="preview-icon">
                  <mat-icon>{{ fileIcon(asset()!) }}</mat-icon>
                </div>
              }
            </div>
          </mat-card>

          <mat-card class="info-card">
            <h2>Details</h2>
            <dl class="kv">
              <dt>Name</dt>
              <dd>{{ asset()!.name }}</dd>
              <dt>Type</dt>
              <dd>{{ formatLabel(asset()!.assetType) }}</dd>
              <dt>Status</dt>
              <dd>{{ formatLabel(asset()!.status) }}</dd>
              <dt>Visibility</dt>
              <dd>{{ formatLabel(asset()!.visibility) }}</dd>
              <dt>Description</dt>
              <dd>{{ asset()!.description || '—' }}</dd>
              <dt>Source URL</dt>
              <dd>
                @if (asset()!.sourceUrl) {
                  <a [href]="asset()!.sourceUrl" target="_blank" rel="noopener">{{ asset()!.sourceUrl }}</a>
                } @else {
                  —
                }
              </dd>
              <dt>File URL</dt>
              <dd>
                @if (asset()!.fileUrl) {
                  <a [href]="asset()!.fileUrl" target="_blank" rel="noopener">{{ asset()!.fileUrl }}</a>
                } @else {
                  —
                }
              </dd>
              <dt>MIME type</dt>
              <dd>{{ asset()!.mimeType || '—' }}</dd>
              <dt>Dimensions</dt>
              <dd>{{ dimensions(asset()!) }}</dd>
              <dt>Size</dt>
              <dd>{{ formatBytes(asset()!.sizeBytes) }}</dd>
              <dt>Duration</dt>
              <dd>{{ formatDuration(asset()!.durationSeconds) }}</dd>
            </dl>

            <h3>Tags <span class="field-hint">— Labels for filtering and categorization. Use AI Enrich to auto-generate.</span></h3>
            @if (tagsList().length) {
              <mat-chip-set class="tag-set">
                @for (t of tagsList(); track t) {
                  <mat-chip disabled>{{ t }}</mat-chip>
                }
              </mat-chip-set>
            } @else {
              <p class="muted">No tags yet. Click <strong>AI Enrich Metadata</strong> above to auto-generate tags, or add them manually when editing.</p>
            }

            <h3>Meta (JSON) <span class="field-hint">— Structured metadata like dimensions, colors, or custom fields. AI Enrich populates this.</span></h3>
            <pre class="json-block">{{ formatJson(asset()!.metaJson) }}</pre>
          </mat-card>
        </div>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Versions</mat-card-title>
            <mat-card-subtitle>Track iterations of this asset. Each version records a new file URL, version type, and optional change notes.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (versions().length === 0) {
              <p class="muted">No versions yet. When you revise this asset (e.g. a new crop, color correction, or resized variant), add a version here to keep the full history.</p>
            } @else {
              <table mat-table [dataSource]="versions()" class="ver-table">
                <ng-container matColumnDef="versionNumber">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let v">{{ v.versionNumber }}</td>
                </ng-container>
                <ng-container matColumnDef="versionType">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let v">{{ v.versionType }}</td>
                </ng-container>
                <ng-container matColumnDef="changeNotes">
                  <th mat-header-cell *matHeaderCellDef>Notes</th>
                  <td mat-cell *matCellDef="let v">{{ v.changeNotes || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let v">{{ v.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="versionColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: versionColumns"></tr>
              </table>
            }

            <div class="add-ver">
              <button mat-stroked-button type="button" (click)="toggleVersionForm()">
                <mat-icon>add</mat-icon>
                Add Version
              </button>
            </div>

            @if (showVersionForm()) {
              <div class="version-form">
                <p class="form-intro">Upload a new revision of this asset. The original is preserved and this becomes the latest version.</p>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>File URL</mat-label>
                  <input matInput [(ngModel)]="newVersionFileUrl" name="vfu" required placeholder="https://storage.example.com/assets/hero-banner-v2.png" />
                  <mat-hint>URL of the new file version (CDN, cloud storage, etc.)</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Version type</mat-label>
                  <mat-select [(ngModel)]="newVersionType" name="vty">
                    @for (vt of versionTypes; track vt) {
                      <mat-option [value]="vt">{{ vt }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>Major = significant change, Minor = small tweak, Patch = fix, Derived = new format/crop</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Change notes (optional)</mat-label>
                  <textarea matInput rows="2" [(ngModel)]="newVersionNotes" name="vn" placeholder="e.g. Adjusted color balance and added text overlay"></textarea>
                  <mat-hint>Describe what changed in this version</mat-hint>
                </mat-form-field>
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  [disabled]="!newVersionFileUrl.trim() || addingVersion()"
                  (click)="submitVersion()"
                >
                  Save Version
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Usage</mat-card-title>
            <mat-card-subtitle>Shows all campaigns, ads, and templates where this asset is referenced</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (usageLoading()) {
              <mat-spinner diameter="32"></mat-spinner>
            } @else if (usage().length === 0) {
              <p class="muted">No usage records yet. When this asset is linked to campaigns, sponsored units, or templates, those connections appear here. You can manually record usage via <a routerLink="/creative/usage" class="inline-link">Usage & Links</a>.</p>
            } @else {
              <table mat-table [dataSource]="usage()" class="usage-table">
                <ng-container matColumnDef="usedEntityType">
                  <th mat-header-cell *matHeaderCellDef>Used entity type</th>
                  <td mat-cell *matCellDef="let u">{{ u.usedEntityType }}</td>
                </ng-container>
                <ng-container matColumnDef="usedEntityId">
                  <th mat-header-cell *matHeaderCellDef>Used entity ID</th>
                  <td mat-cell *matCellDef="let u">{{ u.usedEntityId }}</td>
                </ng-container>
                <ng-container matColumnDef="relationType">
                  <th mat-header-cell *matHeaderCellDef>Relation</th>
                  <td mat-cell *matCellDef="let u">{{ u.relationType || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Created</th>
                  <td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="usageColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: usageColumns"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>AI Provenance</mat-card-title>
            <mat-card-subtitle>Every AI operation on this asset is recorded for full provenance and audit trail</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (aiLoading()) {
              <mat-spinner diameter="32"></mat-spinner>
            } @else if (aiLinks().length === 0) {
              <p class="muted">No AI runs yet. Click <strong>AI Enrich Metadata</strong> above to auto-generate tags and descriptions, or use the <a routerLink="/creative/ai" class="inline-link">AI Generator</a> to create copy for this asset. All AI operations are tracked here for auditability.</p>
            } @else {
              <table mat-table [dataSource]="aiLinks()" class="ai-table">
                <ng-container matColumnDef="aiPromptRunId">
                  <th mat-header-cell *matHeaderCellDef>Run ID</th>
                  <td mat-cell *matCellDef="let l">
                    <a [routerLink]="['/ai/proposals']" class="mono">{{ l.aiPromptRunId }}</a>
                  </td>
                </ng-container>
                <ng-container matColumnDef="aiConversationId">
                  <th mat-header-cell *matHeaderCellDef>Conversation</th>
                  <td mat-cell *matCellDef="let l" class="mono">{{ l.aiConversationId || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Created</th>
                  <td mat-cell *matCellDef="let l">{{ l.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="aiColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: aiColumns"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .callout {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
      }
      .callout-warn {
        background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent);
        border: 1px solid var(--border-default);
      }
      .spinner-wrap {
        display: flex;
        justify-content: center;
        padding: 64px;
      }
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        margin-bottom: 16px;
        color: var(--text-secondary);
      }
      .breadcrumb a {
        color: var(--color-primary);
        text-decoration: none;
      }
      .bc-sep {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--text-muted);
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }
      .toolbar-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .btn-spin {
        display: inline-block;
        vertical-align: middle;
        margin-right: 4px;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
        gap: 20px;
        margin-bottom: 20px;
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      .preview-card {
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
      }
      .preview-inner {
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-surface-hover);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .preview-media {
        max-width: 100%;
        max-height: 360px;
        object-fit: contain;
      }
      .preview-icon {
        padding: 48px;
        color: var(--text-muted);
      }
      .preview-icon mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }
      .info-card {
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
        padding: 16px 20px;
      }
      .info-card h2 {
        margin: 0 0 12px;
        font-size: 18px;
        color: var(--text-primary);
      }
      .info-card h3 {
        margin: 20px 0 8px;
        font-size: 14px;
        color: var(--text-secondary);
      }
      .kv {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 12px;
        margin: 0;
        font-size: 14px;
      }
      .kv dt {
        color: var(--text-muted);
        margin: 0;
      }
      .kv dd {
        margin: 0;
        color: var(--text-primary);
        word-break: break-all;
      }
      .json-block {
        margin: 0;
        padding: 12px;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        font-size: 12px;
        overflow: auto;
        max-height: 240px;
      }
      .tag-set {
        margin-top: 4px;
      }
      .muted {
        color: var(--text-muted);
        font-size: 14px;
      }
      .section {
        margin-bottom: 20px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
      }
      .ver-table,
      .usage-table,
      .ai-table {
        width: 100%;
      }
      .add-ver {
        margin-top: 12px;
      }
      .version-form {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 480px;
      }
      .full {
        width: 100%;
      }
      .mono {
        font-family: ui-monospace, monospace;
        font-size: 12px;
      }
      .context-help { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; margin-bottom: 20px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
      .context-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 1px; }
      .context-content { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .context-nav { font-size: 12px; }
      .context-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .context-nav a:hover { text-decoration: underline; }
      .inline-link { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .inline-link:hover { text-decoration: underline; }
      .field-hint { font-size: 12px; font-weight: 400; color: var(--text-muted); }
      .form-intro { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.5; }
    `,
  ],
})
export class AssetDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly assetsApi = inject(CreativeAssetsApiService);
  private readonly aiApi = inject(CreativeAiApiService);
  private readonly usageApi = inject(CreativeUsageApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(true);
  readonly asset = signal<CreativeAssetResponse | null>(null);
  readonly versions = signal<CreativeAssetVersionResponse[]>([]);
  readonly usage = signal<CreativeUsageResponse[]>([]);
  readonly usageLoading = signal(false);
  readonly aiLinks = signal<CreativeAiRunLinkResponse[]>([]);
  readonly aiLoading = signal(false);

  readonly enriching = signal(false);
  readonly archiving = signal(false);
  readonly showVersionForm = signal(false);
  readonly addingVersion = signal(false);

  readonly versionColumns = ['versionNumber', 'versionType', 'changeNotes', 'createdAt'];
  readonly usageColumns = ['usedEntityType', 'usedEntityId', 'relationType', 'createdAt'];
  readonly aiColumns = ['aiPromptRunId', 'aiConversationId', 'createdAt'];
  readonly versionTypes = VERSION_TYPES;

  newVersionFileUrl = '';
  newVersionType = 'MINOR';
  newVersionNotes = '';

  private assetId = '';

  ngOnInit(): void {
    this.assetId = this.route.snapshot.paramMap.get('assetId') ?? '';
    this.reload();
  }

  tagsList(): string[] {
    const a = this.asset();
    if (!a?.tags) return [];
    try {
      const j = JSON.parse(a.tags);
      return Array.isArray(j) ? j.map(String) : [];
    } catch {
      return [];
    }
  }

  reload(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.assetId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.assetsApi.getAsset(ws, this.assetId).subscribe({
      next: (a) => {
        this.asset.set(a);
        this.loading.set(false);
        this.loadVersions(ws);
        this.loadUsage(ws);
        this.loadAi(ws);
      },
      error: () => {
        this.asset.set(null);
        this.loading.set(false);
        this.notify.error('Failed to load asset');
      },
    });
  }

  private loadVersions(ws: string): void {
    this.assetsApi.listVersions(ws, this.assetId).subscribe({
      next: (v) => this.versions.set(v ?? []),
      error: () => this.versions.set([]),
    });
  }

  private loadUsage(ws: string): void {
    this.usageLoading.set(true);
    this.usageApi
      .listUsage(ws, {
        creativeEntityType: 'CREATIVE_ASSET',
        creativeEntityId: this.assetId,
      })
      .subscribe({
        next: (u) => {
          this.usage.set(u ?? []);
          this.usageLoading.set(false);
        },
        error: () => {
          this.usage.set([]);
          this.usageLoading.set(false);
        },
      });
  }

  private loadAi(ws: string): void {
    this.aiLoading.set(true);
    this.aiApi
      .listAiLinks(ws, {
        producedEntityType: 'CREATIVE_ASSET',
        producedEntityId: this.assetId,
      })
      .subscribe({
        next: (l) => {
          this.aiLinks.set(l ?? []);
          this.aiLoading.set(false);
        },
        error: () => {
          this.aiLinks.set([]);
          this.aiLoading.set(false);
        },
      });
  }

  isImage(a: CreativeAssetResponse): boolean {
    const m = (a.mimeType || '').toLowerCase();
    if (m.startsWith('image/')) return true;
    return a.assetType === 'IMAGE' || a.assetType === 'THUMBNAIL';
  }

  isVideo(a: CreativeAssetResponse): boolean {
    const m = (a.mimeType || '').toLowerCase();
    if (m.startsWith('video/')) return true;
    return a.assetType === 'VIDEO' || a.assetType === 'UGC_CLIP';
  }

  fileIcon(a: CreativeAssetResponse): string {
    if (a.assetType === 'AUDIO') return 'audiotrack';
    if (a.assetType === 'DOCUMENT') return 'description';
    return 'insert_drive_file';
  }

  dimensions(a: CreativeAssetResponse): string {
    if (a.width != null && a.height != null) return `${a.width} × ${a.height}`;
    return '—';
  }

  formatBytes(n: number | null | undefined): string {
    if (n == null || n <= 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i > 0 ? 1 : 0)} ${u[i]}`;
  }

  formatDuration(sec: number | null | undefined): string {
    if (sec == null || sec <= 0) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  formatJson(raw: string | null | undefined): string {
    if (!raw) return '{}';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  enrich(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.enriching.set(true);
    this.aiApi.enrichAsset(ws, this.assetId, {}).subscribe({
      next: (res) => {
        this.enriching.set(false);
        this.notify.success(`Enrichment started — proposal ${res.proposalId}, run ${res.runId}`);
      },
      error: (e) => {
        this.enriching.set(false);
        this.notify.error(e?.error?.message ?? 'Enrich failed');
      },
    });
  }

  archive(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.archiving.set(true);
    this.assetsApi.archiveAsset(ws, this.assetId).subscribe({
      next: () => {
        this.archiving.set(false);
        this.notify.success('Asset archived');
        this.reload();
      },
      error: (e) => {
        this.archiving.set(false);
        this.notify.error(e?.error?.message ?? 'Archive failed');
      },
    });
  }

  toggleVersionForm(): void {
    this.showVersionForm.update((v) => !v);
  }

  submitVersion(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.addingVersion.set(true);
    this.assetsApi
      .addVersion(ws, this.assetId, {
        fileUrl: this.newVersionFileUrl.trim(),
        versionType: this.newVersionType,
        changeNotes: this.newVersionNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.addingVersion.set(false);
          this.notify.success('Version added');
          this.newVersionFileUrl = '';
          this.newVersionNotes = '';
          this.showVersionForm.set(false);
          this.loadVersions(ws);
        },
        error: (e) => {
          this.addingVersion.set(false);
          this.notify.error(e?.error?.message ?? 'Failed to add version');
        },
      });
  }
}
