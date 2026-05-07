import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CreativeAssetResponse } from '../models/creative.models';
import { CreativeAssetsApiService } from '../services/creative-assets-api.service';

const ASSET_TYPES = [
  'IMAGE',
  'VIDEO',
  'UGC_CLIP',
  'DOCUMENT',
  'THUMBNAIL',
  'AUDIO',
  'OTHER',
] as const;

const ASSET_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

@Component({
  selector: 'app-assets-list',
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <span>Creative Studio</span>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Assets</span>
          </nav>
          <h1>Creative Assets</h1>
          <p class="page-desc">Your central library for images, videos, UGC clips, documents, and thumbnails. Register assets by URL, track versions, and connect them to campaigns and ads.</p>
        </div>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="toggleCreate()"
          matTooltip="Register a new creative asset"
        >
          <mat-icon>add</mat-icon>
          New Asset
        </button>
      </header>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace from the sidebar to view and manage your creative assets.</p>
        </mat-card>
      } @else {
        <mat-card class="filters-card">
          <p class="filter-hint">Filter your asset library by type, status, or search by name and description. Press Enter or click Apply to update results.</p>
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Asset type</mat-label>
              <mat-select [(ngModel)]="filterType" name="ft">
                <mat-option value="">All types</mat-option>
                @for (t of assetTypes; track t) {
                  <mat-option [value]="t">{{ formatLabel(t) }}</mat-option>
                }
              </mat-select>
              <mat-hint>Image, Video, UGC, etc.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="filterStatus" name="fs">
                <mat-option value="">All statuses</mat-option>
                @for (s of assetStatuses; track s) {
                  <mat-option [value]="s">{{ formatLabel(s) }}</mat-option>
                }
              </mat-select>
              <mat-hint>Draft, Active, Archived</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-grow">
              <mat-label>Search</mat-label>
              <input
                matInput
                [(ngModel)]="searchQuery"
                name="q"
                placeholder="Search by asset name or description…"
                (keyup.enter)="applyFilters()"
              />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="applyFilters()" matTooltip="Apply current filters to refresh results">
              <mat-icon>filter_list</mat-icon>
              Apply
            </button>
          </div>
        </mat-card>

        @if (showCreate()) {
          <mat-card class="create-card">
            <mat-card-header>
              <mat-card-title>Register a new asset</mat-card-title>
              <mat-card-subtitle>Add a creative file to your library by providing its URL and metadata. The asset will start in Draft status.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="create-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="createName" name="cn" required placeholder="e.g. Hero Banner Q1" />
                <mat-hint>A descriptive name to identify this asset in your library</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Asset type</mat-label>
                <mat-select [(ngModel)]="createAssetType" name="cat" required>
                  @for (t of assetTypes; track t) {
                    <mat-option [value]="t">{{ formatLabel(t) }}</mat-option>
                  }
                </mat-select>
                <mat-hint>The format of this asset — determines how it's displayed and organized</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Source URL</mat-label>
                <input
                  matInput
                  [(ngModel)]="createSourceUrl"
                  name="csu"
                  placeholder="https://storage.example.com/assets/hero-banner.png"
                  required
                />
                <mat-hint>The URL where this file is hosted (CDN, cloud storage, etc.)</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Description (optional)</mat-label>
                <textarea matInput rows="2" [(ngModel)]="createDescription" name="cd" placeholder="Brief description of this asset's purpose and content"></textarea>
                <mat-hint>Helps with searching and gives context to team members</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Tags (optional)</mat-label>
                <input
                  matInput
                  [(ngModel)]="createTags"
                  name="ctg"
                  placeholder="e.g. summer, promo, facebook, hero"
                />
                <mat-hint>Comma-separated labels for filtering and organization</mat-hint>
              </mat-form-field>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button type="button" (click)="toggleCreate()">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!createName.trim() || !createSourceUrl.trim() || !createAssetType"
                (click)="submitCreate()"
              >
                Create Asset
              </button>
            </mat-card-actions>
          </mat-card>
        }

        @if (!showCreate() && assets().length > 0) {
          <mat-card class="help-banner">
            <mat-icon class="help-icon">tips_and_updates</mat-icon>
            <div class="help-content">
              <span><strong>Click any asset card</strong> to view full details, upload new versions, see where it's used across campaigns, or run <strong>AI Enrich</strong> to auto-generate tags and descriptions.</span>
              <span class="help-nav">
                Related:
                <a routerLink="/creative/copy">Copy Library</a> &middot;
                <a routerLink="/creative/ai">AI Generator</a> &middot;
                <a routerLink="/creative/usage">Usage & Links</a> &middot;
                <a routerLink="/creative/folders">Folders</a> &middot;
                <a routerLink="/creative/variants">Variant Sets</a>
              </span>
            </div>
          </mat-card>
        }

        @if (!showCreate() && !loading() && assets().length > 0 && showLifecycleGuide()) {
          <mat-card class="lifecycle-card">
            <div class="lifecycle-header">
              <mat-icon>route</mat-icon>
              <h3>Asset Lifecycle</h3>
              <button mat-icon-button type="button" (click)="dismissLifecycleGuide()" matTooltip="Dismiss guide" class="dismiss-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="lifecycle-steps">
              <div class="lc-step">
                <div class="lc-num">1</div>
                <div class="lc-body">
                  <strong>Register</strong>
                  <span>Add assets by URL. They start as <em>Draft</em>.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">2</div>
                <div class="lc-body">
                  <strong>Enrich</strong>
                  <span>Use <a routerLink="/creative/ai">AI Enrich</a> to auto-tag and describe.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">3</div>
                <div class="lc-body">
                  <strong>Organize</strong>
                  <span>Add to <a routerLink="/creative/folders">Folders</a> and tag for discoverability.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">4</div>
                <div class="lc-body">
                  <strong>Use</strong>
                  <span>Link to campaigns, ads, and copy via <a routerLink="/creative/usage">Usage</a>.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">5</div>
                <div class="lc-body">
                  <strong>Version</strong>
                  <span>Upload new versions to track creative iterations.</span>
                </div>
              </div>
            </div>
          </mat-card>
        }

        @if (loading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="48"></mat-spinner>
          </div>
        } @else if (assets().length === 0) {
          <mat-card class="empty-card">
            <mat-icon>perm_media</mat-icon>
            <h3>Your asset library is empty</h3>
            <p>Creative Assets is your central hub for all visual and media files. Register images, videos, UGC clips, documents, and more — then connect them to your campaigns and ads.</p>
            <div class="empty-actions">
              <button mat-flat-button color="primary" type="button" (click)="toggleCreate()">
                <mat-icon>add</mat-icon> Register Your First Asset
              </button>
            </div>

            <div class="onboarding-grid">
              <div class="onboard-card">
                <mat-icon class="onboard-icon">cloud_upload</mat-icon>
                <strong>Register by URL</strong>
                <span>Provide a link to any hosted file — CDN, cloud storage, or DAM. We store the URL and metadata, not the binary file itself.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">auto_awesome</mat-icon>
                <strong>AI-Powered Enrichment</strong>
                <span>After adding an asset, use <a routerLink="/creative/ai">AI Enrich</a> to auto-generate tags, descriptions, and metadata suggestions.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">history</mat-icon>
                <strong>Version Tracking</strong>
                <span>Upload new file versions over time. Every version is recorded with type (major/minor/patch) and change notes.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">share</mat-icon>
                <strong>Usage & Linking</strong>
                <span>See which campaigns, ads, and templates reference each asset via <a routerLink="/creative/usage">Usage & Links</a>.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">folder</mat-icon>
                <strong>Folder Organization</strong>
                <span>Group assets into <a routerLink="/creative/folders">Folders</a> by campaign, project, platform, or any structure you need.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">view_carousel</mat-icon>
                <strong>Variant Testing</strong>
                <span>Group asset variations into <a routerLink="/creative/variants">Variant Sets</a> for A/B testing and performance comparison.</span>
              </div>
            </div>
          </mat-card>
        } @else {
          <div class="grid">
            @for (a of assets(); track a.id) {
              <mat-card
                class="asset-card"
                role="button"
                tabindex="0"
                (click)="openDetail(a.id)"
                (keyup.enter)="openDetail(a.id)"
              >
                <div class="thumb-wrap">
                  @if (thumbOk()[a.id]) {
                    <img [src]="a.fileUrl" [alt]="a.name" (error)="onImgError(a.id)" />
                  } @else {
                    <div class="thumb-fallback">
                      <mat-icon>{{ thumbIcon(a) }}</mat-icon>
                    </div>
                  }
                </div>
                <mat-card-content>
                  <h3 class="card-title">{{ a.name }}</h3>
                  <div class="badges">
                    <span class="badge type">{{ formatLabel(a.assetType) }}</span>
                    <span class="badge status" [class]="'st-' + a.status.toLowerCase()">{{
                      formatLabel(a.status)
                    }}</span>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>

          <mat-paginator
            [length]="totalElements()"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[12, 24, 48]"
            (page)="onPage($event)"
          ></mat-paginator>
        }
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px;
        max-width: 1280px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      .header-text h1 {
        margin: 8px 0 0;
        font-size: 26px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .bc-sep {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--text-muted);
      }
      .callout {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
      }
      .callout-warn {
        background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent);
        border: 1px solid var(--border-default);
        color: var(--text-primary);
      }
      .filters-card {
        margin-bottom: 16px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        padding: 8px 4px 4px;
      }
      .filter-field {
        width: 180px;
      }
      .filter-grow {
        flex: 1;
        min-width: 200px;
      }
      .create-card {
        margin-bottom: 20px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
      }
      .create-grid {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 8px;
      }
      .full {
        width: 100%;
      }
      .spinner-wrap {
        display: flex;
        justify-content: center;
        padding: 64px;
      }
      .empty-card {
        text-align: center;
        padding: 48px 24px;
        color: var(--text-muted);
        border-radius: var(--radius-md);
      }
      .empty-card mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
        opacity: 0.5;
      }
      .page-desc { color: var(--text-secondary); font-size: 14px; margin: 4px 0 0; max-width: 640px; line-height: 1.5; }
      .filter-hint { font-size: 12px; color: var(--text-muted); margin: 8px 8px 0; line-height: 1.4; }
      .empty-card h3 { margin: 12px 0 8px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
      .empty-card > p { max-width: 560px; margin: 0 auto; line-height: 1.5; color: var(--text-secondary); font-size: 14px; }
      .empty-actions { margin: 20px 0; }
      .onboarding-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; text-align: left; margin-top: 28px; max-width: 800px; margin-left: auto; margin-right: auto; }
      .onboard-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface); }
      .onboard-card strong { font-size: 14px; color: var(--text-primary); }
      .onboard-card span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .onboard-card a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .onboard-card a:hover { text-decoration: underline; }
      .onboard-icon { font-size: 24px; width: 24px; height: 24px; color: var(--color-primary); margin-bottom: 4px; }
      .help-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 16px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
      .help-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; }
      .help-content { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
      .help-nav { font-size: 12px; }
      .help-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .help-nav a:hover { text-decoration: underline; }
      .lifecycle-card { margin-bottom: 16px; padding: 16px 20px; border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
      .lifecycle-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
      .lifecycle-header mat-icon:first-child { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; }
      .lifecycle-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); flex: 1; }
      .dismiss-btn { margin-left: auto; }
      .lifecycle-steps { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; }
      .lc-step { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 140px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); }
      .lc-num { width: 24px; height: 24px; border-radius: 50%; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .lc-body { display: flex; flex-direction: column; gap: 2px; }
      .lc-body strong { font-size: 13px; color: var(--text-primary); }
      .lc-body span { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
      .lc-body a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .lc-body a:hover { text-decoration: underline; }
      .lc-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); align-self: center; flex-shrink: 0; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      }
      .asset-card {
        cursor: pointer;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
        background: var(--bg-surface);
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .asset-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        border-color: var(--color-primary);
      }
      .thumb-wrap {
        aspect-ratio: 16 / 10;
        background: var(--bg-surface-hover, #f5f5f5);
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .thumb-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .thumb-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-muted);
      }
      .thumb-fallback mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }
      .card-title {
        margin: 0 0 8px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .badge.type {
        background: color-mix(in srgb, var(--color-primary) 15%, transparent);
        color: var(--color-primary);
      }
      .badge.status {
        background: var(--bg-surface-hover);
        color: var(--text-secondary);
      }
      .badge.st-active {
        color: var(--color-primary);
      }
      .badge.st-archived {
        color: var(--text-muted);
      }
    `,
  ],
})
export class AssetsListComponent implements OnInit {
  private readonly assetsApi = inject(CreativeAssetsApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly assetTypes = [...ASSET_TYPES];
  readonly assetStatuses = [...ASSET_STATUSES];

  readonly loading = signal(false);
  readonly assets = signal<CreativeAssetResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(12);
  readonly showCreate = signal(false);
  readonly showLifecycleGuide = signal(true);
  readonly thumbOk = signal<Record<string, boolean>>({});

  filterType = '';
  filterStatus = '';
  searchQuery = '';

  createName = '';
  createAssetType = 'IMAGE';
  createSourceUrl = '';
  createDescription = '';
  createTags = '';

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  ngOnInit(): void {
    this.load();
  }

  workspaceIdValue(): string | null {
    return this.adminStore.selectedWorkspaceId();
  }

  load(): void {
    const ws = this.workspaceIdValue();
    if (!ws) return;
    this.loading.set(true);
    this.assetsApi
      .listAssets(ws, {
        type: this.filterType || undefined,
        status: this.filterStatus || undefined,
        q: this.searchQuery.trim() || undefined,
        page: this.pageIndex(),
        size: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.assets.set(res.content ?? []);
          this.totalElements.set(res.totalElements ?? 0);
          const next: Record<string, boolean> = {};
          for (const a of res.content ?? []) {
            next[a.id] = this.shouldTryThumb(a);
          }
          this.thumbOk.set(next);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.notify.error(e?.error?.message ?? 'Failed to load assets');
        },
      });
  }

  private shouldTryThumb(a: CreativeAssetResponse): boolean {
    const mime = (a.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    const t = a.assetType;
    return t === 'IMAGE' || t === 'THUMBNAIL';
  }

  thumbIcon(a: CreativeAssetResponse): string {
    const t = a.assetType;
    if (t === 'VIDEO' || t === 'UGC_CLIP') return 'movie';
    if (t === 'AUDIO') return 'audiotrack';
    if (t === 'DOCUMENT') return 'description';
    return 'insert_drive_file';
  }

  onImgError(id: string): void {
    const cur = { ...this.thumbOk() };
    cur[id] = false;
    this.thumbOk.set(cur);
  }

  applyFilters(): void {
    this.pageIndex.set(0);
    this.load();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.load();
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
  }

  submitCreate(): void {
    const ws = this.workspaceIdValue();
    if (!ws) return;
    const tagsJson = this.tagsToJson(this.createTags);
    this.assetsApi
      .createAsset(ws, {
        name: this.createName.trim(),
        assetType: this.createAssetType,
        sourceUrl: this.createSourceUrl.trim(),
        description: this.createDescription.trim() || undefined,
        tags: tagsJson,
      })
      .subscribe({
        next: () => {
          this.notify.success('Asset created');
          this.createName = '';
          this.createSourceUrl = '';
          this.createDescription = '';
          this.createTags = '';
          this.showCreate.set(false);
          this.applyFilters();
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Create failed'),
      });
  }

  private tagsToJson(raw: string): string {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return JSON.stringify(parts);
  }

  dismissLifecycleGuide(): void {
    this.showLifecycleGuide.set(false);
  }

  openDetail(assetId: string): void {
    void this.router.navigate(['/creative/assets', assetId]);
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
