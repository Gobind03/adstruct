import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { AdminStore } from '@features/admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { BrandAssetsApiService } from '../services/brand-assets-api.service';
import { BrandAssetResponse } from '../models/governance.models';

@Component({
  selector: 'app-brand-assets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-text">
        <h2>Brand Assets</h2>
        <p class="subtitle">
          Manage approved logos, icons, fonts, and images that can be used across campaigns, ads,
          and social posts. Assets registered here become the single source of truth for creative
          production.
        </p>
      </div>
    </div>

    <!-- Guide banner -->
    @if (showGuide()) {
      <mat-card class="info-banner">
        <mat-card-content>
          <div class="banner-header">
            <div class="banner-title">
              <mat-icon class="banner-icon">school</mat-icon>
              <strong>How Brand Assets work</strong>
            </div>
            <button mat-icon-button (click)="showGuide.set(false)" matTooltip="Dismiss" aria-label="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="banner-body">
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-number">1</div>
                <div>
                  <strong>Register an asset</strong>
                  <p>Provide a name, type (logo, icon, font, image), and the file URL where the asset is hosted.</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div>
                  <strong>Choose the scope</strong>
                  <p><strong>ORG</strong> assets are available to all workspaces. <strong>WORKSPACE</strong> assets are only visible within the selected workspace.</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div>
                  <strong>Use in templates &amp; campaigns</strong>
                  <p>Registered assets can be referenced in <a routerLink="/governance/templates">Templates</a> and creative generation. AI agents will only use approved assets.</p>
                </div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p>
                <mat-icon inline>lightbulb</mat-icon>
                <strong>Tip:</strong> Include dimensions and MIME type to help AI agents pick the right asset for each platform's requirements.
              </p>
              <p>
                <mat-icon inline>link</mat-icon>
                Assets work alongside your <a routerLink="/governance/profile">Brand Profile</a> — the profile defines colors and fonts, assets provide the actual files.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <button mat-stroked-button class="show-guide-btn" (click)="showGuide.set(true)">
        <mat-icon>school</mat-icon> Show guide
      </button>
    }

    <!-- Main content -->
    <mat-card>
      <mat-card-content>
        @if (!orgId()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">business</mat-icon>
            <h3>No organization selected</h3>
            <p>Select an organization from the top bar to view and manage brand assets.</p>
          </div>
        } @else {
          <!-- Toolbar: filters + register -->
          <div class="toolbar">
            <div class="filters">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Scope</mat-label>
                <mat-select [formControl]="filterForm.controls.scope">
                  <mat-option value="">All scopes</mat-option>
                  <mat-option value="ORG">Organization</mat-option>
                  <mat-option value="WORKSPACE">Workspace</mat-option>
                </mat-select>
                <mat-hint>Filter by visibility level</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [formControl]="filterForm.controls.status">
                  <mat-option value="">All statuses</mat-option>
                  <mat-option value="ACTIVE">Active</mat-option>
                  <mat-option value="ARCHIVED">Archived</mat-option>
                </mat-select>
                <mat-hint>Filter by lifecycle status</mat-hint>
              </mat-form-field>
              <span class="asset-count" matTooltip="Matching assets">
                {{ filteredAssets().length }} asset{{ filteredAssets().length !== 1 ? 's' : '' }}
              </span>
            </div>

            <button mat-raised-button color="primary" (click)="showRegisterForm.set(!showRegisterForm())">
              <mat-icon>{{ showRegisterForm() ? 'close' : 'add' }}</mat-icon>
              {{ showRegisterForm() ? 'Cancel' : 'Register new asset' }}
            </button>
          </div>

          <!-- Register form -->
          @if (showRegisterForm()) {
            <mat-card class="register-card">
              <mat-card-content>
                <h3 class="register-title"><mat-icon inline>add_photo_alternate</mat-icon> Register a new brand asset</h3>
                <p class="register-help">
                  Provide the details of the asset you want to approve for use. The file URL should point to a
                  publicly accessible or internally hosted file (e.g. CDN, S3 bucket, or DAM system).
                </p>
                <form [formGroup]="createForm" (ngSubmit)="registerAsset()" class="register-form">
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Asset name</mat-label>
                      <input matInput formControlName="name" placeholder="e.g. Primary Logo - Dark" />
                      <mat-hint>A descriptive name to identify this asset</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Asset type</mat-label>
                      <mat-select formControlName="assetType">
                        @for (t of assetTypeOptions; track t.value) {
                          <mat-option [value]="t.value">
                            <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
                          </mat-option>
                        }
                      </mat-select>
                      <mat-hint>What kind of file is this?</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Scope</mat-label>
                      <mat-select formControlName="scope">
                        <mat-option value="ORG">Organization — visible to all workspaces</mat-option>
                        <mat-option value="WORKSPACE">Workspace — only this workspace</mat-option>
                      </mat-select>
                      <mat-hint>Who can use this asset?</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>MIME type</mat-label>
                      <input matInput formControlName="mimeType" placeholder="e.g. image/png, image/svg+xml" />
                      <mat-hint>Optional — helps with format validation</mat-hint>
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>File URL</mat-label>
                    <input matInput formControlName="fileUrl" placeholder="https://cdn.example.com/logos/primary-dark.svg" />
                    <mat-icon matPrefix>link</mat-icon>
                    <mat-hint>Direct URL to the asset file (CDN, S3, or DAM link)</mat-hint>
                  </mat-form-field>
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Width (px)</mat-label>
                      <input matInput type="number" formControlName="width" placeholder="e.g. 512" />
                      <mat-hint>Optional — helps AI pick the right size</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Height (px)</mat-label>
                      <input matInput type="number" formControlName="height" placeholder="e.g. 512" />
                      <mat-hint>Optional — helps AI pick the right size</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="register-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || registering()">
                      <mat-icon>check</mat-icon> Register asset
                    </button>
                    <button mat-stroked-button type="button" (click)="showRegisterForm.set(false)">Cancel</button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Asset table -->
          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="36"></mat-spinner>
              <p class="spinner-label">Loading brand assets…</p>
            </div>
          } @else if (filteredAssets().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">image</mat-icon>
              <h3>No assets found</h3>
              @if (filterForm.value.scope || filterForm.value.status) {
                <p>No assets match your current filters. Try changing the scope or status filter, or register a new asset.</p>
              } @else {
                <p>You haven't registered any brand assets yet. Click "Register new asset" above to add your first logo, icon, or image.</p>
              }
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="filteredAssets()" class="full-width asset-table">
                <!-- Preview -->
                <ng-container matColumnDef="preview">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    @if (isImageAsset(row)) {
                      <div class="preview-thumb" [style.backgroundImage]="'url(' + row.fileUrl + ')'"></div>
                    } @else {
                      <div class="preview-thumb placeholder">
                        <mat-icon>{{ assetTypeIcon(row.assetType) }}</mat-icon>
                      </div>
                    }
                  </td>
                </ng-container>

                <!-- Name -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="name-cell">
                      <strong>{{ row.name }}</strong>
                      @if (row.mimeType) {
                        <span class="mime-label">{{ row.mimeType }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Type -->
                <ng-container matColumnDef="assetType">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="type-chip">
                      <mat-icon>{{ assetTypeIcon(row.assetType) }}</mat-icon>
                      {{ assetTypeLabel(row.assetType) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Scope -->
                <ng-container matColumnDef="scope">
                  <th mat-header-cell *matHeaderCellDef>Scope</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="scope-chip" [class]="row.scope.toLowerCase()"
                      [matTooltip]="row.scope === 'ORG' ? 'Available to all workspaces' : 'Only this workspace'">
                      {{ row.scope === 'ORG' ? 'Organization' : 'Workspace' }}
                    </span>
                  </td>
                </ng-container>

                <!-- Dimensions -->
                <ng-container matColumnDef="dimensions">
                  <th mat-header-cell *matHeaderCellDef>Dimensions</th>
                  <td mat-cell *matCellDef="let row">
                    <span [class.not-set]="!row.width">{{ dimLabel(row) }}</span>
                  </td>
                </ng-container>

                <!-- Status -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="status-chip" [class]="row.status.toLowerCase()">{{ row.status }}</span>
                  </td>
                </ng-container>

                <!-- Actions -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="actionMenu" matTooltip="Actions">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #actionMenu="matMenu">
                      <a mat-menu-item [href]="row.fileUrl" target="_blank" rel="noopener">
                        <mat-icon>open_in_new</mat-icon> Open file URL
                      </a>
                      @if (row.status === 'ACTIVE') {
                        <button mat-menu-item (click)="archiveAsset(row)">
                          <mat-icon>archive</mat-icon> Archive
                        </button>
                      } @else {
                        <button mat-menu-item (click)="reactivateAsset(row)">
                          <mat-icon>unarchive</mat-icon> Reactivate
                        </button>
                      }
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>

    <!-- Related pages -->
    @if (orgId()) {
      <mat-divider class="related-divider"></mat-divider>
      <div class="related-pages">
        <h3>Related</h3>
        <div class="related-grid">
          <a routerLink="/governance/profile" class="related-card">
            <mat-icon>palette</mat-icon>
            <div>
              <strong>Brand Profile</strong>
              <span>Set colors, fonts, and voice guidelines that complement your assets.</span>
            </div>
          </a>
          <a routerLink="/governance/templates" class="related-card">
            <mat-icon>description</mat-icon>
            <div>
              <strong>Templates</strong>
              <span>Create ad copy and social post templates that reference your approved assets.</span>
            </div>
          </a>
          <a routerLink="/governance/platform-constraints" class="related-card">
            <mat-icon>tune</mat-icon>
            <div>
              <strong>Platform Constraints</strong>
              <span>See image size and format requirements for each ad platform.</span>
            </div>
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Page header */
    h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 6px; }
    .subtitle { color: var(--text-muted, #666); margin: 0 0 20px; font-size: 14px; line-height: 1.5; max-width: 640px; }

    /* Guide banner */
    .info-banner { margin-bottom: 20px; border-left: 4px solid #1976d2; background: #f5f9ff; }
    .banner-header { display: flex; align-items: center; justify-content: space-between; }
    .banner-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .banner-icon { color: #1976d2; }
    .banner-body { margin-top: 16px; }
    .guide-steps { display: flex; flex-direction: column; gap: 14px; padding: 4px 0 16px; }
    .guide-step { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; line-height: 1.5; }
    .guide-step p { margin: 2px 0 0; color: #555; }
    .guide-step a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .guide-step a:hover { text-decoration: underline; }
    .step-number {
      flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
      background: #1976d2; color: #fff; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .banner-tips { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .banner-tips p { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; color: #555; }
    .banner-tips a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .banner-tips a:hover { text-decoration: underline; }
    .show-guide-btn { margin-bottom: 16px; font-size: 13px; }
    .show-guide-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Toolbar */
    .toolbar { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
    .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .filter-field { width: 180px; }
    .asset-count { font-size: 13px; color: var(--text-muted, #888); padding-top: 12px; }
    .toolbar button mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Register form card */
    .register-card { margin-bottom: 24px; border: 1px solid #e3f2fd; background: #fafcff; }
    .register-title { font-size: 16px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
    .register-title mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .register-help { font-size: 13px; color: var(--text-muted, #888); margin: 0 0 16px; line-height: 1.5; }
    .register-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
    @media (max-width: 700px) { .form-row-2 { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .register-actions { display: flex; gap: 12px; margin-top: 8px; }
    .register-actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Table */
    .table-container { overflow-x: auto; }
    .asset-table { width: 100%; }
    .asset-table th { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }

    /* Preview thumbnail */
    .preview-thumb {
      width: 40px; height: 40px; border-radius: 6px; border: 1px solid rgba(0,0,0,.08);
      background-size: contain; background-repeat: no-repeat; background-position: center;
      background-color: #fafafa;
    }
    .preview-thumb.placeholder { display: flex; align-items: center; justify-content: center; }
    .preview-thumb.placeholder mat-icon { font-size: 20px; width: 20px; height: 20px; color: #bbb; }

    /* Name cell */
    .name-cell { display: flex; flex-direction: column; gap: 2px; }
    .name-cell strong { font-size: 14px; }
    .mime-label { font-size: 11px; color: #999; font-family: monospace; }

    /* Type chip */
    .type-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; color: #555; }
    .type-chip mat-icon { font-size: 16px; width: 16px; height: 16px; color: #888; }

    /* Scope chip */
    .scope-chip {
      font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px;
      letter-spacing: 0.02em;
    }
    .scope-chip.org { background: #e3f2fd; color: #1565c0; }
    .scope-chip.workspace { background: #fff3e0; color: #e65100; }

    /* Status chip */
    .status-chip { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.archived { background: #f5f5f5; color: #888; }
    .not-set { color: #bbb; font-style: italic; }

    /* Spinner */
    .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; }
    .spinner-label { font-size: 14px; color: var(--text-muted, #888); }

    /* Empty state */
    .empty-state { text-align: center; padding: 56px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .empty-state p { margin: 0; font-size: 14px; color: var(--text-muted, #888); max-width: 420px; margin-inline: auto; line-height: 1.5; }

    /* Related pages */
    .related-divider { margin: 28px 0 20px; }
    .related-pages h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 12px; }
    .related-card {
      display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: 10px;
      border: 1px solid rgba(0,0,0,.08); text-decoration: none; color: inherit;
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .related-card:hover { background: #f5f9ff; border-color: #90caf9; box-shadow: 0 2px 8px rgba(25,118,210,.08); }
    .related-card mat-icon { color: #1976d2; flex-shrink: 0; margin-top: 2px; }
    .related-card strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .related-card span { font-size: 12px; color: #777; line-height: 1.4; }
  `],
})
export class BrandAssetsComponent implements OnInit, OnDestroy {
  private api = inject(BrandAssetsApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  private filterSub?: Subscription;

  readonly loading = signal(false);
  readonly registering = signal(false);
  readonly showGuide = signal(true);
  readonly showRegisterForm = signal(false);
  readonly assets = signal<BrandAssetResponse[]>([]);

  readonly displayedColumns = ['preview', 'name', 'assetType', 'scope', 'dimensions', 'status', 'actions'];

  readonly assetTypeOptions = [
    { value: 'LOGO', label: 'Logo', icon: 'branding_watermark' },
    { value: 'ICON', label: 'Icon', icon: 'interests' },
    { value: 'FONT_FILE', label: 'Font file', icon: 'font_download' },
    { value: 'BRAND_IMAGE', label: 'Brand image', icon: 'image' },
  ];

  orgId = this.adminStore.selectedOrgId;

  filterForm = this.fb.group({ scope: [''], status: [''] });

  createForm = this.fb.group({
    scope: ['ORG', Validators.required],
    name: ['', Validators.required],
    assetType: ['LOGO', Validators.required],
    fileUrl: ['', Validators.required],
    width: [null as number | null],
    height: [null as number | null],
    mimeType: [''],
  });

  ngOnInit(): void {
    this.filterSub = this.filterForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this.load());
    this.load();
  }

  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }

  filteredAssets(): BrandAssetResponse[] {
    const scope = this.filterForm.value.scope;
    const status = this.filterForm.value.status;
    let list = this.assets();
    if (scope === 'ORG') list = list.filter((a) => a.scope === 'ORG' || a.workspaceId == null);
    else if (scope === 'WORKSPACE') list = list.filter((a) => a.scope === 'WORKSPACE' || a.workspaceId != null);
    if (status) list = list.filter((a) => a.status === status);
    return list;
  }

  dimLabel(row: BrandAssetResponse): string {
    if (row.width != null && row.height != null) return `${row.width} × ${row.height}`;
    return 'Not set';
  }

  isImageAsset(row: BrandAssetResponse): boolean {
    const mime = row.mimeType?.toLowerCase() ?? '';
    const type = row.assetType;
    return type === 'LOGO' || type === 'ICON' || type === 'BRAND_IMAGE' ||
      mime.startsWith('image/');
  }

  assetTypeIcon(type: string): string {
    return this.assetTypeOptions.find((t) => t.value === type)?.icon ?? 'insert_drive_file';
  }

  assetTypeLabel(type: string): string {
    return this.assetTypeOptions.find((t) => t.value === type)?.label ?? type;
  }

  load(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) { this.assets.set([]); return; }
    const ws = this.adminStore.selectedWorkspaceId();
    const scope = this.filterForm.value.scope;
    const status = this.filterForm.value.status || undefined;
    const workspaceId = scope === 'WORKSPACE' && ws ? ws : undefined;
    this.loading.set(true);
    this.api.list(org, workspaceId, status).subscribe({
      next: (data) => { this.assets.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.notify.error(err.error?.detail || 'Failed to load brand assets'); },
    });
  }

  registerAsset(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org || this.createForm.invalid) return;
    const v = this.createForm.getRawValue();
    const wsId = this.adminStore.selectedWorkspaceId();
    this.registering.set(true);
    this.api.create(org, {
      scope: v.scope!,
      workspaceId: v.scope === 'WORKSPACE' && wsId ? wsId : undefined,
      name: v.name!,
      assetType: v.assetType!,
      fileUrl: v.fileUrl!,
      width: v.width ?? undefined,
      height: v.height ?? undefined,
      mimeType: v.mimeType || undefined,
    }).subscribe({
      next: () => {
        this.registering.set(false);
        this.notify.success('Asset registered successfully');
        this.createForm.reset({ scope: 'ORG', name: '', assetType: 'LOGO', fileUrl: '', width: null, height: null, mimeType: '' });
        this.showRegisterForm.set(false);
        this.load();
      },
      error: (err) => {
        this.registering.set(false);
        this.notify.error(err.error?.detail || 'Failed to register asset');
      },
    });
  }

  archiveAsset(row: BrandAssetResponse): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) return;
    this.api.patch(org, row.id, { status: 'ARCHIVED' }).subscribe({
      next: () => { this.notify.success(`"${row.name}" archived`); this.load(); },
      error: (err) => this.notify.error(err.error?.detail || 'Failed to archive asset'),
    });
  }

  reactivateAsset(row: BrandAssetResponse): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) return;
    this.api.patch(org, row.id, { status: 'ACTIVE' }).subscribe({
      next: () => { this.notify.success(`"${row.name}" reactivated`); this.load(); },
      error: (err) => this.notify.error(err.error?.detail || 'Failed to reactivate asset'),
    });
  }
}
