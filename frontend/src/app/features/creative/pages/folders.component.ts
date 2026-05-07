import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CreativeAssetResponse, FolderResponse } from '../models/creative.models';
import { CreativeAssetsApiService } from '../services/creative-assets-api.service';

@Component({
  selector: 'app-folders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- Header -->
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Folders</span>
          </nav>
          <h1>Folders</h1>
          <p class="page-desc">
            Organize your creative assets into a hierarchical folder structure.
            Create top-level folders for campaigns, projects, or platforms, then
            nest sub-folders for granular organization. Assets from the
            <a routerLink="/creative/assets">Assets Library</a> can be added to
            any folder.
          </p>
        </div>
        <div class="header-actions">
          <button
            mat-stroked-button
            type="button"
            routerLink="/creative/assets"
            matTooltip="Go to the Assets Library to upload and manage creative files"
          >
            <mat-icon>photo_library</mat-icon>
            Assets Library
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="toggleCreate()"
            matTooltip="Create a new folder to organize your creative assets"
          >
            <mat-icon>create_new_folder</mat-icon>
            New Folder
          </button>
        </div>
      </header>

      <!-- No workspace selected -->
      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <div>
            <p><strong>No workspace selected</strong></p>
            <p>Select a workspace from the sidebar to view and manage your folders. Each workspace has its own folder hierarchy.</p>
          </div>
        </mat-card>
      } @else {

        <!-- Workflow guide (dismissable) -->
        @if (showWorkflowGuide() && !showCreate()) {
          <mat-card class="workflow-card">
            <div class="workflow-header">
              <mat-icon>route</mat-icon>
              <h3>How Folders Work</h3>
              <button mat-icon-button type="button" (click)="dismissWorkflowGuide()" matTooltip="Dismiss this guide" class="dismiss-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="workflow-steps">
              <div class="wf-step">
                <div class="wf-num">1</div>
                <div class="wf-body">
                  <strong>Create Folders</strong>
                  <span>Set up top-level folders (e.g. "Q1 Campaign", "Product Shots") using the <em>New Folder</em> button above.</span>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step">
                <div class="wf-num">2</div>
                <div class="wf-body">
                  <strong>Nest Sub-folders</strong>
                  <span>Create child folders by selecting a parent. Build as many levels deep as you need.</span>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step">
                <div class="wf-num">3</div>
                <div class="wf-body">
                  <strong>Add Assets</strong>
                  <span>Expand any folder and click <em>Add Asset</em> to assign assets from your <a routerLink="/creative/assets">library</a>.</span>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step">
                <div class="wf-num">4</div>
                <div class="wf-body">
                  <strong>Browse & Manage</strong>
                  <span>Click asset names to view details. Rename or delete folders as your projects evolve.</span>
                </div>
              </div>
            </div>
          </mat-card>
        }

        <!-- Create folder form -->
        @if (showCreate()) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>Create a new folder</mat-card-title>
              <mat-card-subtitle>Folders help you group related assets together. Choose a descriptive name and optionally nest it inside an existing folder.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="form-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Folder name</mat-label>
                <input matInput [(ngModel)]="createName" name="cn" required placeholder='e.g. "Q1 Campaign", "Hero Banners", "UGC"' />
                <mat-hint>A descriptive name that tells your team what this folder contains</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Parent folder (optional)</mat-label>
                <mat-select [(ngModel)]="createParentId" name="cp">
                  <mat-option [value]="''">
                    <mat-icon class="opt-icon">home</mat-icon>
                    Root level (no parent)
                  </mat-option>
                  @for (f of folders(); track f.id) {
                    <mat-option [value]="f.id">
                      <mat-icon class="opt-icon">subdirectory_arrow_right</mat-icon>
                      {{ folderLabel(f) }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>Leave as "Root level" to create a top-level folder, or select a parent to nest it inside</mat-hint>
              </mat-form-field>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button type="button" (click)="toggleCreate()">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!createName.trim()"
                (click)="submitCreate()"
                matTooltip="Create the folder and add it to your hierarchy"
              >
                Create Folder
              </button>
            </mat-card-actions>
          </mat-card>
        }

        <!-- Help banner (shown when folders exist and create form is hidden) -->
        @if (!showCreate() && folders().length > 0) {
          <mat-card class="help-banner">
            <mat-icon class="help-icon">tips_and_updates</mat-icon>
            <div class="help-content">
              <span><strong>Expand any folder</strong> to view its assets, add new ones, or manage the folder. Use the <span class="icon-in-text"><mat-icon class="inline-icon">more_vert</mat-icon></span> menu on each folder for rename and delete options.</span>
              <span class="help-nav">
                Related:
                <a routerLink="/creative/assets">Assets Library</a> &middot;
                <a routerLink="/creative/copy">Copy Library</a> &middot;
                <a routerLink="/creative/ai">AI Generator</a> &middot;
                <a routerLink="/creative/variants">Variant Sets</a> &middot;
                <a routerLink="/creative/usage">Usage & Links</a>
              </span>
            </div>
          </mat-card>
        }

        <!-- Folder stats bar -->
        @if (!loading() && folders().length > 0) {
          <div class="stats-bar">
            <div class="stat">
              <mat-icon class="stat-icon">folder</mat-icon>
              <span><strong>{{ rootFolderCount() }}</strong> root {{ rootFolderCount() === 1 ? 'folder' : 'folders' }}</span>
            </div>
            <div class="stat">
              <mat-icon class="stat-icon">account_tree</mat-icon>
              <span><strong>{{ folders().length }}</strong> total {{ folders().length === 1 ? 'folder' : 'folders' }}</span>
            </div>
            <div class="stat">
              <mat-icon class="stat-icon">subdirectory_arrow_right</mat-icon>
              <span><strong>{{ nestedFolderCount() }}</strong> nested</span>
            </div>
          </div>
        }

        @if (loading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="48"></mat-spinner>
            <p class="loading-text">Loading your folder hierarchy...</p>
          </div>
        } @else if (folders().length === 0) {
          <mat-card class="empty-card">
            <mat-icon>folder_open</mat-icon>
            <h3>No folders yet</h3>
            <p>Folders let you organize your creative assets by project, campaign, platform, or any structure that makes sense for your team.</p>
            <div class="empty-actions">
              <button mat-flat-button color="primary" type="button" (click)="toggleCreate()" matTooltip="Create your first folder to start organizing">
                <mat-icon>create_new_folder</mat-icon> Create Your First Folder
              </button>
            </div>

            <div class="onboarding-grid">
              <div class="onboard-card">
                <mat-icon class="onboard-icon">folder_special</mat-icon>
                <strong>Hierarchical Organization</strong>
                <span>Create root folders and nest sub-folders to any depth. Structure them by campaign, season, product line, or however your team works best.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">photo_library</mat-icon>
                <strong>Asset Assignment</strong>
                <span>Assign assets from your <a routerLink="/creative/assets">Assets Library</a> to folders. One asset can live in multiple folders for flexible cross-referencing.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">search</mat-icon>
                <strong>Quick Discovery</strong>
                <span>Expand folders to instantly browse their contents. Click any asset name to jump to its full detail page with versions, tags, and usage info.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">edit</mat-icon>
                <strong>Easy Management</strong>
                <span>Rename folders as projects evolve, delete empty ones you no longer need, or reorganize by changing parent folders.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">auto_awesome</mat-icon>
                <strong>Works with AI</strong>
                <span>Use the <a routerLink="/creative/ai">AI Generator</a> to create assets, then organize them here. AI-enriched tags make assets easier to find.</span>
              </div>
              <div class="onboard-card">
                <mat-icon class="onboard-icon">category</mat-icon>
                <strong>Suggested Structures</strong>
                <span>Try organizing by: campaign name, platform (Meta/Google/TikTok), asset type, season/quarter, or client name.</span>
              </div>
            </div>
          </mat-card>
        } @else {
          <mat-accordion class="accordion" multi>
            @for (f of sortedFolders(); track f.id) {
              <mat-expansion-panel (opened)="onFolderOpened(f.id)">
                <mat-expansion-panel-header>
                  <mat-panel-title [style.padding-left.px]="folderIndentPx(f)">
                    <mat-icon class="folder-icon" [class.nested-icon]="!!f.parentFolderId">
                      {{ f.parentFolderId ? 'folder' : 'folder_special' }}
                    </mat-icon>
                    @if (renamingFolderId() === f.id) {
                      <input
                        class="inline-rename"
                        [(ngModel)]="renameValue"
                        (click)="$event.stopPropagation()"
                        (keyup.enter)="submitRename(f.id)"
                        (keyup.escape)="cancelRename()"
                        placeholder="Folder name"
                      />
                      <button mat-icon-button (click)="submitRename(f.id); $event.stopPropagation()" matTooltip="Save name" class="rename-action">
                        <mat-icon>check</mat-icon>
                      </button>
                      <button mat-icon-button (click)="cancelRename(); $event.stopPropagation()" matTooltip="Cancel rename" class="rename-action">
                        <mat-icon>close</mat-icon>
                      </button>
                    } @else {
                      {{ f.name }}
                    }
                  </mat-panel-title>
                  <mat-panel-description>
                    @if (f.parentFolderId) {
                      <span class="muted" matTooltip="This folder is nested inside another folder">
                        <mat-icon class="desc-icon">subdirectory_arrow_right</mat-icon>
                        {{ parentFolderName(f.parentFolderId) }}
                      </span>
                    } @else {
                      <span class="muted root-badge" matTooltip="Top-level folder at the root of your hierarchy">
                        <mat-icon class="desc-icon">home</mat-icon> Root
                      </span>
                    }
                    <span class="asset-count" matTooltip="Number of assets in this folder">
                      {{ (assetsByFolder()[f.id] ?? []).length }} assets
                    </span>
                    <button
                      mat-icon-button
                      [matMenuTriggerFor]="folderMenu"
                      (click)="$event.stopPropagation()"
                      matTooltip="Folder actions"
                      class="folder-menu-btn"
                    >
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #folderMenu="matMenu">
                      <button mat-menu-item (click)="startRename(f)">
                        <mat-icon>edit</mat-icon>
                        <span>Rename folder</span>
                      </button>
                      <button mat-menu-item (click)="startAddAsset(f.id)">
                        <mat-icon>add_photo_alternate</mat-icon>
                        <span>Add asset to folder</span>
                      </button>
                      <button mat-menu-item (click)="confirmDelete(f)" class="delete-item">
                        <mat-icon>delete_outline</mat-icon>
                        <span>Delete folder</span>
                      </button>
                    </mat-menu>
                  </mat-panel-description>
                </mat-expansion-panel-header>
                <div class="panel-body">
                  <!-- Add asset to folder form (inline) -->
                  @if (addAssetFolderId() === f.id) {
                    <div class="add-asset-form">
                      <mat-icon class="add-asset-icon">add_photo_alternate</mat-icon>
                      <mat-form-field appearance="outline" class="add-asset-field">
                        <mat-label>Asset to add</mat-label>
                        <mat-select [(ngModel)]="addAssetSelectedId" name="addAsset">
                          @for (a of availableAssets(); track a.id) {
                            <mat-option [value]="a.id">{{ a.name }} ({{ formatLabel(a.assetType) }})</mat-option>
                          }
                        </mat-select>
                        <mat-hint>Select an asset from your library to add to "{{ f.name }}"</mat-hint>
                      </mat-form-field>
                      <button
                        mat-flat-button
                        color="primary"
                        type="button"
                        [disabled]="!addAssetSelectedId"
                        (click)="submitAddAsset(f.id)"
                        matTooltip="Add the selected asset to this folder"
                      >
                        Add
                      </button>
                      <button mat-button type="button" (click)="cancelAddAsset()">Cancel</button>
                      @if (availableAssets().length === 0 && !assetsLoadingForAdd()) {
                        <p class="add-asset-hint">
                          <mat-icon class="tip-icon-sm">info</mat-icon>
                          No assets in your library yet. <a routerLink="/creative/assets">Create an asset first</a>, then come back to add it.
                        </p>
                      }
                    </div>
                  }

                  <!-- Delete confirmation -->
                  @if (deletingFolderId() === f.id) {
                    <div class="delete-confirm">
                      <mat-icon class="delete-warn-icon">warning</mat-icon>
                      <div class="delete-confirm-content">
                        <p><strong>Delete "{{ f.name }}"?</strong></p>
                        <p>This will permanently remove this folder. Assets inside will not be deleted — they remain in your library.</p>
                        <div class="delete-confirm-actions">
                          <button mat-flat-button color="warn" type="button" (click)="submitDelete(f.id)">Yes, Delete Folder</button>
                          <button mat-button type="button" (click)="cancelDelete()">Cancel</button>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Assets list -->
                  @if (assetsLoading()[f.id]) {
                    <div class="mini-spinner">
                      <mat-spinner diameter="28"></mat-spinner>
                      <span class="muted">Loading assets...</span>
                    </div>
                  } @else if ((assetsByFolder()[f.id] ?? []).length === 0) {
                    <div class="empty-folder-msg">
                      <mat-icon class="empty-folder-icon">inbox</mat-icon>
                      <div>
                        <p class="muted"><strong>This folder is empty.</strong></p>
                        <p class="muted">Add assets from the <a routerLink="/creative/assets">Assets Library</a> using the <span class="icon-in-text"><mat-icon class="inline-icon">more_vert</mat-icon></span> menu, or click below.</p>
                        <button mat-stroked-button type="button" (click)="startAddAsset(f.id)" matTooltip="Browse your asset library and add assets to this folder" class="add-asset-btn-sm">
                          <mat-icon>add_photo_alternate</mat-icon> Add Asset
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="folder-asset-header">
                      <span class="muted">{{ (assetsByFolder()[f.id] ?? []).length }} asset{{ (assetsByFolder()[f.id] ?? []).length === 1 ? '' : 's' }} in this folder</span>
                      <button mat-stroked-button type="button" (click)="startAddAsset(f.id)" matTooltip="Add another asset to this folder" class="add-asset-btn-sm">
                        <mat-icon>add</mat-icon> Add Asset
                      </button>
                    </div>
                    <ul class="asset-list">
                      @for (a of assetsByFolder()[f.id] ?? []; track a.id) {
                        <li>
                          <div class="asset-info">
                            <mat-icon class="asset-type-icon">{{ assetTypeIcon(a.assetType) }}</mat-icon>
                            <a [routerLink]="['/creative/assets', a.id]" matTooltip="View full asset details, versions, and usage">{{ a.name }}</a>
                            <span class="pill">{{ formatLabel(a.assetType) }}</span>
                            @if (a.status) {
                              <span class="pill status-pill" [class]="'st-' + a.status.toLowerCase()">{{ formatLabel(a.status) }}</span>
                            }
                          </div>
                          <button
                            mat-icon-button
                            matTooltip="Remove this asset from the folder (the asset itself won't be deleted)"
                            (click)="removeAsset(f.id, a.id, a.name)"
                            class="remove-asset-btn"
                          >
                            <mat-icon>link_off</mat-icon>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>

          <!-- Bottom help -->
          <div class="bottom-help">
            <mat-icon class="bottom-help-icon">help_outline</mat-icon>
            <div class="bottom-help-content">
              <p><strong>Need more assets?</strong> Head to the <a routerLink="/creative/assets">Assets Library</a> to register images, videos, and documents by URL.</p>
              <p>Use the <a routerLink="/creative/ai">AI Generator</a> to auto-create ad copy, or try <a routerLink="/creative/variants">Variant Sets</a> for A/B testing.</p>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .page { padding: 24px; max-width: 880px; margin: 0 auto; }

      /* Header */
      .header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .header-text h1 { margin: 8px 0 0; font-size: 26px; font-weight: 600; color: var(--text-primary); }
      .header-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); line-height: 18px; }
      .bc-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .bc-link:hover { text-decoration: underline; }
      .bc-sep { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); vertical-align: middle; }
      .page-desc { color: var(--text-secondary); font-size: 14px; margin: 4px 0 0; max-width: 640px; line-height: 1.5; }
      .page-desc a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .page-desc a:hover { text-decoration: underline; }

      /* Callout */
      .callout { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: var(--radius-md); }
      .callout > mat-icon { font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; color: var(--color-warn, #f9a825); vertical-align: middle; }
      .callout-warn { background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent); border: 1px solid var(--border-default); }
      .callout-warn p { margin: 0 0 4px; color: var(--text-secondary); font-size: 14px; line-height: 1.5; }
      .callout-warn p:last-child { margin-bottom: 0; }

      /* Workflow guide */
      .workflow-card { margin-bottom: 16px; padding: 16px 20px; border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
      .workflow-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
      .workflow-header > mat-icon:first-child { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; vertical-align: middle; }
      .workflow-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); flex: 1; line-height: 22px; }
      .dismiss-btn { margin-left: auto; }
      .workflow-steps { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; }
      .wf-step { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 160px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); }
      .wf-num { width: 24px; height: 24px; border-radius: 50%; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; }
      .wf-body { display: flex; flex-direction: column; gap: 2px; }
      .wf-body strong { font-size: 13px; color: var(--text-primary); line-height: 24px; }
      .wf-body span { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
      .wf-body a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .wf-body a:hover { text-decoration: underline; }
      .wf-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); align-self: center; flex-shrink: 0; vertical-align: middle; }

      /* Form card */
      .form-card { margin-bottom: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-md); }
      .form-grid { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
      .full { width: 100%; }
      .opt-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 6px; color: var(--text-muted); vertical-align: middle; }

      /* Spinner */
      .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 64px; gap: 12px; }
      .loading-text { color: var(--text-muted); font-size: 14px; margin: 0; }

      /* Stats bar */
      .stats-bar { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; padding: 10px 16px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); }
      .stat { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); line-height: 18px; }
      .stat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
      .stat strong { color: var(--text-primary); }

      /* Empty state */
      .empty-card { text-align: center; padding: 48px 24px; color: var(--text-muted); }
      .empty-card > mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; margin: 0 auto; display: block; }
      .empty-card h3 { margin: 12px 0 8px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
      .empty-card > p { max-width: 560px; margin: 0 auto; line-height: 1.5; color: var(--text-secondary); font-size: 14px; }
      .empty-actions { margin: 20px 0; }
      .onboarding-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; text-align: left; margin-top: 28px; max-width: 800px; margin-left: auto; margin-right: auto; }
      .onboard-card { display: flex; flex-direction: column; gap: 6px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface); }
      .onboard-card strong { font-size: 14px; color: var(--text-primary); }
      .onboard-card span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .onboard-card a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .onboard-card a:hover { text-decoration: underline; }
      .onboard-icon { font-size: 24px; width: 24px; height: 24px; color: var(--color-primary); display: block; }

      /* Help banner */
      .help-banner { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; margin-bottom: 16px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
      .help-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
      .help-content { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .help-content strong { color: var(--text-primary); }
      .icon-in-text { display: inline-flex; align-items: center; vertical-align: middle; height: 1em; }
      .inline-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; color: var(--text-muted); margin: 0 1px !important; }
      .help-nav { font-size: 12px; margin-top: 2px; }
      .help-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .help-nav a:hover { text-decoration: underline; }

      /* Accordion */
      .accordion { display: flex; flex-direction: column; gap: 8px; }
      .folder-icon { margin-right: 8px; font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); flex-shrink: 0; vertical-align: middle; }
      .nested-icon { color: var(--text-secondary); }
      .muted { color: var(--text-muted); font-size: 13px; line-height: 1.4; }

      /* Panel header alignment */
      :host ::ng-deep .mat-expansion-panel-header-description { align-items: center !important; gap: 8px; }
      :host ::ng-deep .mat-expansion-panel-header-title { align-items: center !important; }
      .desc-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted); margin-right: 2px; vertical-align: middle; }
      .root-badge { display: inline-flex; align-items: center; gap: 3px; }
      .asset-count { display: inline-flex; align-items: center; font-size: 12px; color: var(--text-muted); margin-left: 4px; background: var(--bg-surface-hover, #f0f0f0); padding: 2px 8px; border-radius: 999px; line-height: 1; white-space: nowrap; }
      .folder-menu-btn { margin-left: 4px; flex-shrink: 0; }

      /* Rename inline */
      .inline-rename { border: 1px solid var(--color-primary); border-radius: 4px; padding: 4px 8px; font-size: 14px; background: var(--bg-surface); color: var(--text-primary); outline: none; margin-right: 4px; line-height: 20px; vertical-align: middle; }
      .rename-action { width: 28px !important; height: 28px !important; line-height: 28px !important; }
      .rename-action mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; }

      /* Panel body */
      .panel-body { padding: 8px 0 12px; }
      .mini-spinner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 12px; }

      /* Add asset form */
      .add-asset-form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 12px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 4%, transparent); border: 1px dashed color-mix(in srgb, var(--color-primary) 30%, transparent); }
      .add-asset-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; }
      .add-asset-field { flex: 1; min-width: 200px; }
      .add-asset-hint { width: 100%; font-size: 13px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; margin: 4px 0 0; line-height: 1.4; }
      .add-asset-hint a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .tip-icon-sm { font-size: 16px !important; width: 16px !important; height: 16px !important; color: var(--color-primary); flex-shrink: 0; margin-right: 0 !important; }

      /* Delete confirmation */
      .delete-confirm { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; margin-bottom: 12px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-warn, #d32f2f) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-warn, #d32f2f) 30%, transparent); }
      .delete-warn-icon { color: var(--color-warn, #d32f2f); font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; }
      .delete-confirm-content { padding-top: 2px; }
      .delete-confirm-content p { margin: 0 0 6px; font-size: 14px; color: var(--text-secondary); line-height: 1.4; }
      .delete-confirm-content p:first-child { color: var(--text-primary); }
      .delete-confirm-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
      .delete-item { color: var(--color-warn, #d32f2f) !important; }

      /* Empty folder */
      .empty-folder-msg { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; }
      .empty-folder-icon { font-size: 28px; width: 28px; height: 28px; color: var(--text-muted); opacity: 0.5; flex-shrink: 0; margin-top: 4px; }
      .empty-folder-msg div { display: flex; flex-direction: column; gap: 4px; }
      .empty-folder-msg p { margin: 0; line-height: 1.5; }
      .empty-folder-msg a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .empty-folder-msg a:hover { text-decoration: underline; }
      .add-asset-btn-sm { margin-top: 4px; align-self: flex-start; }

      /* Folder asset header */
      .folder-asset-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }

      /* Asset list */
      .asset-list { list-style: none; margin: 0; padding: 0; }
      .asset-list li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 4px; border-bottom: 1px solid var(--border-default); transition: background 0.1s; }
      .asset-list li:hover { background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
      .asset-list li:last-child { border-bottom: none; }
      .asset-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
      .asset-type-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; vertical-align: middle; }
      .asset-list a { font-weight: 500; color: var(--color-primary); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 20px; }
      .asset-list a:hover { text-decoration: underline; }
      .pill { display: inline-flex; align-items: center; font-size: 11px; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary); flex-shrink: 0; line-height: 16px; white-space: nowrap; }
      .status-pill { background: var(--bg-surface-hover, #f0f0f0); color: var(--text-secondary); }
      .st-active { color: var(--color-primary) !important; }
      .st-archived { color: var(--text-muted) !important; }
      .remove-asset-btn { flex-shrink: 0; opacity: 0.5; transition: opacity 0.15s; }
      .remove-asset-btn:hover { opacity: 1; }

      /* Bottom help */
      .bottom-help { display: flex; align-items: flex-start; gap: 10px; margin-top: 20px; padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); }
      .bottom-help-icon { color: var(--text-muted); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
      .bottom-help-content p { margin: 0 0 4px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .bottom-help-content p:last-child { margin-bottom: 0; }
      .bottom-help-content a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .bottom-help-content a:hover { text-decoration: underline; }
    `,
  ],
})
export class FoldersComponent implements OnInit {
  private readonly assetsApi = inject(CreativeAssetsApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(false);
  readonly folders = signal<FolderResponse[]>([]);
  readonly assetsByFolder = signal<Record<string, CreativeAssetResponse[]>>({});
  readonly assetsLoading = signal<Record<string, boolean>>({});

  readonly showCreate = signal(false);
  readonly showWorkflowGuide = signal(true);
  createName = '';
  createParentId = '';

  readonly renamingFolderId = signal<string | null>(null);
  renameValue = '';

  readonly deletingFolderId = signal<string | null>(null);

  readonly addAssetFolderId = signal<string | null>(null);
  readonly availableAssets = signal<CreativeAssetResponse[]>([]);
  readonly assetsLoadingForAdd = signal(false);
  addAssetSelectedId = '';

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly rootFolderCount = computed(() =>
    this.folders().filter((f) => !f.parentFolderId).length,
  );

  readonly nestedFolderCount = computed(() =>
    this.folders().filter((f) => !!f.parentFolderId).length,
  );

  readonly sortedFolders = computed(() => {
    const list = [...this.folders()];
    const depth = (f: FolderResponse): number => {
      if (!f.parentFolderId) return 0;
      const p = list.find((x) => x.id === f.parentFolderId);
      return p ? 1 + depth(p) : 0;
    };
    list.sort((a, b) => {
      const da = depth(a);
      const db = depth(b);
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });
    return list;
  });

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.loading.set(true);
    this.assetsApi.listFolders(ws).subscribe({
      next: (rows) => {
        this.folders.set(rows ?? []);
        this.assetsByFolder.set({});
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(e?.error?.message ?? 'Failed to load folders');
      },
    });
  }

  folderLabel(f: FolderResponse): string {
    const depth = this.folderDepth(f);
    const pad = depth > 0 ? `${'— '.repeat(depth)}` : '';
    return `${pad}${f.name}`;
  }

  private folderDepth(f: FolderResponse): number {
    if (!f.parentFolderId) return 0;
    const p = this.folders().find((x) => x.id === f.parentFolderId);
    return p ? 1 + this.folderDepth(p) : 0;
  }

  folderIndentPx(f: FolderResponse): number {
    return this.folderDepth(f) * 16;
  }

  parentFolderName(parentId: string): string {
    const parent = this.folders().find((f) => f.id === parentId);
    return parent ? parent.name : 'Unknown';
  }

  onFolderOpened(folderId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    if (this.assetsByFolder()[folderId]) return;
    const ld = { ...this.assetsLoading() };
    ld[folderId] = true;
    this.assetsLoading.set(ld);
    this.assetsApi.listFolderAssets(ws, folderId).subscribe({
      next: (assets) => {
        const next = { ...this.assetsByFolder() };
        next[folderId] = assets ?? [];
        this.assetsByFolder.set(next);
        const l2 = { ...this.assetsLoading() };
        l2[folderId] = false;
        this.assetsLoading.set(l2);
      },
      error: (e) => {
        const l2 = { ...this.assetsLoading() };
        l2[folderId] = false;
        this.assetsLoading.set(l2);
        this.notify.error(e?.error?.message ?? 'Failed to load folder assets');
      },
    });
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
  }

  submitCreate(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.createName.trim()) return;
    const body: { name: string; parentFolderId?: string | null } = {
      name: this.createName.trim(),
    };
    if (this.createParentId.trim()) {
      body.parentFolderId = this.createParentId.trim();
    }
    this.assetsApi.createFolder(ws, body).subscribe({
      next: () => {
        this.notify.success('Folder created');
        this.createName = '';
        this.createParentId = '';
        this.showCreate.set(false);
        this.loadFolders();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Create failed'),
    });
  }

  dismissWorkflowGuide(): void {
    this.showWorkflowGuide.set(false);
  }

  /* --- Rename --- */

  startRename(f: FolderResponse): void {
    this.renamingFolderId.set(f.id);
    this.renameValue = f.name;
  }

  cancelRename(): void {
    this.renamingFolderId.set(null);
    this.renameValue = '';
  }

  submitRename(folderId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.renameValue.trim()) return;
    this.assetsApi.updateFolder(ws, folderId, this.renameValue.trim()).subscribe({
      next: () => {
        this.notify.success('Folder renamed');
        this.cancelRename();
        this.loadFolders();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Rename failed'),
    });
  }

  /* --- Delete --- */

  confirmDelete(f: FolderResponse): void {
    this.deletingFolderId.set(f.id);
  }

  cancelDelete(): void {
    this.deletingFolderId.set(null);
  }

  submitDelete(folderId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.assetsApi.deleteFolder(ws, folderId).subscribe({
      next: () => {
        this.notify.success('Folder deleted');
        this.deletingFolderId.set(null);
        this.loadFolders();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Delete failed'),
    });
  }

  /* --- Add asset to folder --- */

  startAddAsset(folderId: string): void {
    this.addAssetFolderId.set(folderId);
    this.addAssetSelectedId = '';
    this.loadAvailableAssets();
  }

  cancelAddAsset(): void {
    this.addAssetFolderId.set(null);
    this.addAssetSelectedId = '';
  }

  private loadAvailableAssets(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.assetsLoadingForAdd.set(true);
    this.assetsApi.listAssets(ws, { size: 200 }).subscribe({
      next: (res) => {
        this.availableAssets.set(res.content ?? []);
        this.assetsLoadingForAdd.set(false);
      },
      error: () => {
        this.assetsLoadingForAdd.set(false);
        this.notify.error('Failed to load assets list');
      },
    });
  }

  submitAddAsset(folderId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.addAssetSelectedId) return;
    this.assetsApi.addAssetToFolder(ws, folderId, this.addAssetSelectedId).subscribe({
      next: () => {
        this.notify.success('Asset added to folder');
        this.cancelAddAsset();
        this.refreshFolderAssets(folderId);
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Failed to add asset'),
    });
  }

  /* --- Remove asset from folder --- */

  removeAsset(folderId: string, assetId: string, assetName: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.assetsApi.removeAssetFromFolder(ws, folderId, assetId).subscribe({
      next: () => {
        this.notify.success(`"${assetName}" removed from folder`);
        this.refreshFolderAssets(folderId);
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Failed to remove asset'),
    });
  }

  private refreshFolderAssets(folderId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    const next = { ...this.assetsByFolder() };
    delete next[folderId];
    this.assetsByFolder.set(next);
    this.onFolderOpened(folderId);
  }

  assetTypeIcon(assetType: string): string {
    switch (assetType) {
      case 'IMAGE':
      case 'THUMBNAIL':
        return 'image';
      case 'VIDEO':
      case 'UGC_CLIP':
        return 'movie';
      case 'AUDIO':
        return 'audiotrack';
      case 'DOCUMENT':
        return 'description';
      default:
        return 'insert_drive_file';
    }
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
